import { AttachmentProcessingStatus } from "@repo/types/email";
import type { ParsedEmailResult } from "@repo/types/parsedEmail";
import { buildExample, buildSchemaText, buildZodObject, type FieldSpec } from "../schema/runtimeSchema";
import { buildFinalExtractionPrompt } from "../schema/prompts";
import { sanitizeExtractedRecord } from "../schema/promptSecurity";
import { buildParsedEmailResultSchema } from "../schema/parsedEmailResultSchema";
import type { FinalExtractInput, IFinalExtractionService } from "./iFinalExtractionService";
import type { OpenRouterService } from "./openrouterService";

export class FinalExtractionService implements IFinalExtractionService {
  constructor(
    private readonly openRouter: OpenRouterService,
    private readonly model: string,
  ) {}

  private safeParseJson(raw: string, step: string): Record<string, unknown> {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error(`[${step}] No JSON object found in model response`);
    }
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  }

  async extract(input: FinalExtractInput): Promise<ParsedEmailResult> {
    const fields = input.userQuery.outputSchema as Record<string, FieldSpec>;
    const schemaText = buildSchemaText(fields);
    const example = buildExample(fields);

    const prompt = buildFinalExtractionPrompt({
      userQuery: input.userQuery.userQuery,
      schemaText,
      example,
      subject: input.subject,
      sender: input.sender,
      body: input.rawContent.slice(0, 12000),
      attachments: input.attachmentRows
        .filter((a) => a.extractedText)
        .map((a) => ({
          filename: a.filename,
          mimeType: a.mimeType,
          text: a.extractedText!,
        })),
    });

    const raw = await this.openRouter.completeJson(prompt, { step: "final-extract", model: this.model });
    const allowedKeys = new Set(Object.keys(fields));
    const sanitized = sanitizeExtractedRecord(
      allowedKeys,
      this.safeParseJson(raw, "final-extract"),
    );
    const data = buildZodObject(fields).strict().parse(sanitized);

    const attachments: ParsedEmailResult["attachments"] = input.attachmentRows.map((a) => {
      if (!a.extractedText) {
        return {
          filename: a.filename,
          mimeType: a.mimeType,
          localPath: a.localPath,
          status: AttachmentProcessingStatus.Failed,
          data: null,
          error: "No extracted text",
        };
      }
      return {
        filename: a.filename,
        mimeType: a.mimeType,
        localPath: a.localPath,
        status: AttachmentProcessingStatus.Completed,
        data: {
          document_type: null,
          invoice_number: null,
          total_amount: null,
          line_items: null,
        },
      };
    });

    const merged: ParsedEmailResult = {
      email: data as ParsedEmailResult["email"],
      attachments,
    };
    buildParsedEmailResultSchema(fields).parse(merged);
    return merged;
  }
}
