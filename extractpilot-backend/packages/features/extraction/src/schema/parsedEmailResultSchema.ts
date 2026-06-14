import { z } from "zod";
import { buildZodObject, type FieldSpec } from "./runtimeSchema";

const attachmentDataSchema = z.object({
  document_type: z.string().nullable(),
  invoice_number: z.string().nullable(),
  total_amount: z.number().nullable(),
  line_items: z.array(z.record(z.unknown())).nullable(),
});

const attachmentRowSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  localPath: z.string(),
  status: z.enum(["completed", "failed", "skipped", "unsupported"]),
  data: attachmentDataSchema.nullable(),
  error: z.string().optional(),
});

/** Validates `ParsedEmailResult` using the operator's dynamic email field specs. */
export function buildParsedEmailResultSchema(emailFields: Record<string, FieldSpec>) {
  return z.object({
    email: buildZodObject(emailFields),
    attachments: z.array(attachmentRowSchema),
  });
}

const defaultEmailFields: Record<string, FieldSpec> = {
  customer_name: { type: "string", nullable: true },
  issue_type: { type: "string", nullable: true },
  priority: { type: "string", nullable: true },
};

/** Default pipeline schema (scripts / failure fallback). */
export const parsedEmailResultSchema = buildParsedEmailResultSchema(defaultEmailFields);

export type ParsedEmailResultInput = z.infer<typeof parsedEmailResultSchema>;
