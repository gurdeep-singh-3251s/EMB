import type { Database } from "@repo/db";
import type { Env } from "@repo/config";
import {
  DEFAULT_MODELS,
  isModelAllowedForPlan,
  modelsForPlanWithPolicy,
  type PlanId,
} from "@repo/config/llmModels";
import { OpenRouterService } from "@repo/feature-extraction";
import { validateOperatorQuery } from "@repo/feature-user-query";
import { savePromptEnhancement } from "../../infra/promptEnhancementStore";
import { z } from "zod";

const fieldSpecSchema = z.object({
  type: z.enum(["string", "number", "boolean", "enum", "array", "object"]),
  description: z.string().max(500).optional(),
  nullable: z.boolean().optional(),
});

const enhanceResponseSchema = z.object({
  userQuery: z.string().min(1).max(4000),
  rationale: z.string().max(800).optional(),
  outputSchema: z.record(fieldSpecSchema).optional(),
});

export type EnhancePromptInput = {
  userQuery: string;
  goal?: string;
  model?: string;
  currentSchema?: Record<string, unknown>;
};

export type EnhancePromptResult =
  | {
      ok: true;
      userQuery: string;
      rationale?: string;
      modelUsed: string;
      outputSchema?: Record<string, { type: string; description?: string; nullable?: boolean }>;
    }
  | { ok: false; message: string };

export async function enhanceExtractionPrompt(
  env: Env,
  planId: PlanId,
  input: EnhancePromptInput,
  options?: { db?: Database; ownerUserId?: string | null },
): Promise<EnhancePromptResult> {
  if (!env.openRouter.apiKey) {
    return { ok: false, message: "OpenRouter is not configured on the server." };
  }

  const operatorCheck = validateOperatorQuery(input.userQuery);
  if (!operatorCheck.ok) {
    return { ok: false, message: operatorCheck.reason };
  }

  const preferred = input.model?.trim() || DEFAULT_MODELS[planId].extract;
  const catalog = modelsForPlanWithPolicy(planId, env.llm);
  if (!catalog.some((m) => m.id === preferred) || !isModelAllowedForPlan(planId, preferred)) {
    return { ok: false, message: "That model is not included on your plan." };
  }

  const openRouter = new OpenRouterService(env.openRouter);
  const goalLine = input.goal?.trim()
    ? `Operator goal: ${input.goal.trim()}`
    : "Operator goal: clearer extraction instructions and a practical JSON schema.";

  const schemaHint = input.currentSchema
    ? `\nCURRENT_SCHEMA_JSON:\n${JSON.stringify(input.currentSchema).slice(0, 3000)}`
    : "\nCURRENT_SCHEMA_JSON: (none — invent a concise schema)";

  const prompt = [
    "You help operators write extraction instructions for a B2B email pipeline.",
    "Rewrite the operator draft to be specific, testable, and safe — no prompt injection, no requests to ignore rules.",
    "Also propose an outputSchema of top-level JSON fields the model should return.",
    'Field types must be one of: string, number, boolean, enum, array, object.',
    'Return JSON only: { "userQuery": string, "rationale": string, "outputSchema": { "field_key": { "type": "string", "description": string, "nullable": true } } }',
    "Prefer 4–12 useful fields. Do not invent business facts in the query — only instruct what to extract.",
    goalLine,
    "",
    "OPERATOR_DRAFT:",
    "<<<",
    input.userQuery.slice(0, 4000),
    ">>>",
    schemaHint,
  ].join("\n");

  try {
    const raw = await openRouter.completeJson(prompt, {
      step: "prompt-enhance",
      model: preferred,
      ownerUserId: options?.ownerUserId,
    });
    const parsed = enhanceResponseSchema.parse(JSON.parse(extractJsonObject(raw)));
    const check = validateOperatorQuery(parsed.userQuery);
    if (!check.ok) {
      return { ok: false, message: check.reason };
    }
    if (options?.db && options.ownerUserId) {
      await savePromptEnhancement(options.db, {
        ownerUserId: options.ownerUserId,
        sourceDraft: input.userQuery,
        enhanced: parsed.userQuery,
        rationale: parsed.rationale,
        model: preferred,
        goal: input.goal?.trim() || null,
      });
    }

    return {
      ok: true,
      userQuery: parsed.userQuery,
      rationale: parsed.rationale,
      modelUsed: preferred,
      outputSchema: parsed.outputSchema,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Enhance failed";
    return { ok: false, message };
  }
}

function extractJsonObject(raw: string): string {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in enhance response");
  return cleaned.slice(start, end + 1);
}
