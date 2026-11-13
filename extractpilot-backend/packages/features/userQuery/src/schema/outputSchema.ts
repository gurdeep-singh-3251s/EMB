import { z } from "zod";
import { validateOperatorQuery } from "./operatorQueryValidation";

const fieldSpecSchema = z.object({
  type: z.enum(["string", "number", "boolean", "enum", "array", "object"]),
  nullable: z.boolean().optional(),
  description: z.string().optional(),
  values: z.array(z.string()).optional(),
});

export const createUserQuerySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    userQuery: z.string().min(1).max(4000),
    outputSchema: z.record(fieldSpecSchema),
    classifyModel: z.string().min(3).max(128).optional(),
    extractModel: z.string().min(3).max(128).optional(),
  })
  .superRefine((val, ctx) => {
    const check = validateOperatorQuery(val.userQuery);
    if (!check.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: check.reason, path: ["userQuery"] });
    }
  });

export function wrapOutputSchema(fields: Record<string, unknown>): { email: Record<string, unknown> } {
  return { email: fields };
}
