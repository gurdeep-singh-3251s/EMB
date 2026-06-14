import type { ClassificationResult } from "@repo/types/userQuery";
import { z } from "zod";
import { buildClassifyPrompt } from "../schema/prompts";
import { clampModelString } from "../schema/promptSecurity";
import type { FieldSpec } from "../schema/runtimeSchema";
import type { ClassifyEmailInput, IClassificationService } from "./iClassificationService";
import type { OpenRouterService } from "./openrouterService";

const classificationSchema = z.object({
  relevant: z.boolean(),
  confidence: z.number().min(0).max(1).optional(),
  reason: z.string().max(500).optional(),
  likelyFields: z.array(z.string().max(64)).max(32).optional(),
});

export class ClassificationService implements IClassificationService {
  constructor(
    private readonly openRouter: OpenRouterService,
    private readonly model: string,
  ) {}

  private safeParseJson(raw: string): Record<string, unknown> {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON object in classify response");
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  }

  async classify(input: ClassifyEmailInput): Promise<ClassificationResult> {
    const body = input.rawContent.slice(0, 2000);
    const schemaFields = input.userQuery.outputSchema as Record<string, FieldSpec>;
    const allowedKeys = new Set(Object.keys(schemaFields));

    const prompt = buildClassifyPrompt({
      userQuery: input.userQuery.userQuery,
      schemaFields,
      subject: input.subject,
      sender: input.sender,
      body,
      attachments: input.attachments,
    });
    const raw = await this.openRouter.completeJson(prompt, { step: "classify", model: this.model });
    const parsed = classificationSchema.parse(this.safeParseJson(raw));

    const likelyFields = (parsed.likelyFields ?? []).filter((k) => allowedKeys.has(k));

    return {
      relevant: parsed.relevant,
      confidence: parsed.confidence,
      reason: clampModelString(parsed.reason, 500),
      likelyFields: likelyFields.length > 0 ? likelyFields : undefined,
    };
  }
}
