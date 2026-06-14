import { z } from "zod";

export type FieldSpec =
  | { type: "string"; nullable?: boolean; description?: string }
  | { type: "number"; nullable?: boolean; description?: string }
  | { type: "boolean"; nullable?: boolean; description?: string }
  | { type: "enum"; values: string[]; nullable?: boolean; description?: string }
  | { type: "array"; nullable?: boolean; description?: string }
  | { type: "object"; nullable?: boolean; description?: string };

export type ExtractionSchema = {
  email: Record<string, FieldSpec>;
  attachment?: Record<string, FieldSpec>;
};

function specToZod(spec: FieldSpec): z.ZodTypeAny {
  let base: z.ZodTypeAny;
  switch (spec.type) {
    case "string":
      base = z.string().max(2048);
      break;
    case "number":
      base = z.number();
      break;
    case "boolean":
      base = z.boolean();
      break;
    case "enum":
      base = z.enum(spec.values as [string, ...string[]]);
      break;
    case "array":
      base = z.array(z.unknown());
      break;
    case "object":
      base = z.record(z.unknown());
      break;
    default:
      base = z.unknown();
  }
  return spec.nullable ? base.nullable() : base;
}

export function buildZodObject(fields: Record<string, FieldSpec>): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};
  for (const [key, spec] of Object.entries(fields)) {
    shape[key] = specToZod(spec);
  }
  return z.object(shape).strict();
}

export function buildSchemaText(fields: Record<string, FieldSpec>): string {
  const obj: Record<string, string> = {};
  for (const [key, spec] of Object.entries(fields)) {
    const base =
      spec.type === "enum"
        ? `enum(${spec.values.map((v) => JSON.stringify(v)).join(" | ")})`
        : spec.type;
    obj[key] = spec.nullable ? `${base} | null` : base;
  }
  return JSON.stringify(obj, null, 2);
}

/** Human-readable field list for classify / audit prompts. */
export function buildSchemaFieldsGuide(fields: Record<string, FieldSpec>): string {
  const lines: string[] = [];
  for (const [key, spec] of Object.entries(fields)) {
    const typePart =
      spec.type === "enum"
        ? `enum(${spec.values.map((v) => JSON.stringify(v)).join(" | ")})`
        : spec.type;
    const nullablePart = spec.nullable ? ", nullable" : "";
    const descPart = spec.description ? ` — ${spec.description}` : "";
    lines.push(`- ${key} (${typePart}${nullablePart})${descPart}`);
  }
  return lines.length > 0 ? lines.join("\n") : "(no fields defined)";
}

export function buildExample(fields: Record<string, FieldSpec>): string {
  const obj: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(fields)) {
    if (spec.nullable) {
      obj[key] = null;
      continue;
    }
    switch (spec.type) {
      case "string":
        obj[key] = "example";
        break;
      case "number":
        obj[key] = 0;
        break;
      case "boolean":
        obj[key] = false;
        break;
      case "enum":
        obj[key] = spec.values[0] ?? "example";
        break;
      case "array":
        obj[key] = [];
        break;
      case "object":
        obj[key] = {};
        break;
    }
  }
  return JSON.stringify(obj);
}

export function isExtractionSchema(value: unknown): value is ExtractionSchema {
  if (!value || typeof value !== "object") return false;
  if (!("email" in value)) return false;
  const maybe = value as { email?: unknown };
  const email = maybe.email;
  return !!email && typeof email === "object" && !Array.isArray(email);
}

