import type { ClassificationResult } from "@repo/types/userQuery";
import type { ParsedEmailResult } from "@repo/types/parsedEmail";
import { z } from "zod";
import type {
  ClassifyAndExtractResult,
  IClassifyAndExtractService,
} from "./iClassifyAndExtractService";
import type { ClassifyEmailInput } from "./iClassificationService";
import { buildClassifyAndExtractPrompt } from "../schema/prompts";
import { clampModelString, sanitizeExtractedRecord } from "../schema/promptSecurity";
import { buildParsedEmailResultSchema } from "../schema/parsedEmailResultSchema";
import { buildExample, buildSchemaText, buildZodObject, type FieldSpec } from "../schema/runtimeSchema";
import type { OpenRouterService } from "./openrouterService";

export class ClassifyAndExtractService implements IClassifyAndExtractService {
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
    if (start === -1 || end === -1) throw new Error("No JSON object in classify-and-extract response");
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  }

  async classifyAndExtract(input: ClassifyEmailInput): Promise<ClassifyAndExtractResult> {
    const body = input.rawContent.slice(0, 12000);
    const schemaFields = input.userQuery.outputSchema as Record<string, FieldSpec>;
    const allowedKeys = new Set(Object.keys(schemaFields));
    const schemaText = buildSchemaText(schemaFields);
    const example = buildExample(schemaFields);

    const prompt = buildClassifyAndExtractPrompt({
      userQuery: input.userQuery.userQuery,
      schemaFields,
      schemaText,
      example,
      subject: input.subject,
      sender: input.sender,
      body,
    });

    const raw = await this.openRouter.completeJson(prompt, {
      step: "classify-and-extract",
      model: this.model,
    });

    const gateSchema = z.object({
      relevant: z.boolean(),
      confidence: z.number().min(0).max(1).optional(),
      reason: z.string().max(500).optional(),
      likelyFields: z.array(z.string().max(64)).max(32).optional(),
      email: z.record(z.unknown()).nullable().optional(),
    });

    const parsed = gateSchema.parse(this.safeParseJson(raw));
    const likelyFields = (parsed.likelyFields ?? []).filter((k) => allowedKeys.has(k));

    const classification: ClassificationResult = {
      relevant: parsed.relevant,
      confidence: parsed.confidence,
      reason: clampModelString(parsed.reason, 500),
      likelyFields: likelyFields.length > 0 ? likelyFields : undefined,
    };

    if (!parsed.relevant) {
      return { classification, parsed: null };
    }

    const emailData = buildZodObject(schemaFields)
      .strict()
      .parse(sanitizeExtractedRecord(allowedKeys, (parsed.email ?? {}) as Record<string, unknown>));

    const merged: ParsedEmailResult = {
      email: emailData as ParsedEmailResult["email"],
      attachments: [],
    };
    buildParsedEmailResultSchema(schemaFields).parse(merged);

    return { classification, parsed: merged };
  }
}
