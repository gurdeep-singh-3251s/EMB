import { z } from "zod";
import { existsSync } from "node:fs";
import { resolveAttachmentLocalPath } from "@repo/config/paths";
import type { ParsedEmailResult } from "@repo/types/parsedEmail";
import type { RestHandlerDeps, RestStoredEmailAttachment } from "@repo/types/restTypes";
import { BaseRestController } from "../helper/init";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const emailIdSchema = z.string().uuid();

const patchExtractedBodySchema = z
  .object({
    fields: z.record(z.unknown()).optional(),
    attachments: z
      .array(
        z.object({
          filename: z.string().min(1),
          data: z.record(z.unknown()),
        }),
      )
      .optional(),
  })
  .refine((body) => (body.fields && Object.keys(body.fields).length > 0) || (body.attachments?.length ?? 0) > 0, {
    message: "Provide fields and/or attachment corrections.",
  });

class EmailHandler extends BaseRestController {
  async stats(): Promise<Response> {
    const result = await this.ctx.services.email.stats();
    if (!result.success) {
      return this.fromDto(result);
    }
    const counts = result.data;
    const total = Object.values(counts).reduce((sum: number, n) => sum + (Number(n) || 0), 0);
    return this.success({ ...counts, total }, null, 200);
  }

  async list(url: URL): Promise<Response> {
    const parsed = listQuerySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });
    if (!parsed.success) {
      return this.validationError(parsed.error.message, parsed.error.flatten());
    }
    const result = await this.ctx.services.email.list(parsed.data);
    return this.fromDto(result);
  }

  async byId(emailId: string): Promise<Response> {
    const idCheck = emailIdSchema.safeParse(emailId);
    if (!idCheck.success) {
      return this.validationError("Invalid email id", idCheck.error.flatten());
    }
    const result = await this.ctx.services.email.byId(idCheck.data);
    if (!result.success) {
      return this.fromDto(result);
    }
    const data = this.toEmailDetailRestData(result.data);
    return this.success(data, null, 200);
  }

  async patchExtracted(emailId: string, req: Request): Promise<Response> {
    const idCheck = emailIdSchema.safeParse(emailId);
    if (!idCheck.success) {
      return this.validationError("Invalid email id", idCheck.error.flatten());
    }

    const body = await this.readJson(req);
    const parsed = patchExtractedBodySchema.safeParse(body);
    if (!parsed.success) {
      return this.validationError(parsed.error.message, parsed.error.flatten());
    }

    const result = await this.ctx.services.email.patchHumanReview(idCheck.data, parsed.data);
    if (!result.success) {
      return this.fromDto(result);
    }
    const data = this.toEmailDetailRestData(result.data);
    return this.success(data, "Corrections saved", 200);
  }

  async listAttachments(emailId: string): Promise<Response> {
    const idCheck = emailIdSchema.safeParse(emailId);
    if (!idCheck.success) {
      return this.validationError("Invalid email id", idCheck.error.flatten());
    }

    const emailRes = await this.ctx.services.email.byId(idCheck.data);
    if (!emailRes.success) {
      return this.fromDto(emailRes);
    }

    const attRes = await this.ctx.services.attachment.byEmailId(idCheck.data);
    if (!attRes.success) {
      return this.fromDto(attRes);
    }

    const parsed = emailRes.data.parsedJson as ParsedEmailResult | null;
    const pipelineByName = new Map(
      (parsed?.attachments ?? []).map((att) => [att.filename, att]),
    );
    const root = this.deps.env.attachmentsRoot;
    const seen = new Set<string>();
    const items: RestStoredEmailAttachment[] = [];

    for (const row of attRes.data) {
      seen.add(row.filename);
      const pipeline = pipelineByName.get(row.filename);
      const filePath = resolveAttachmentLocalPath(row.localPath, root);
      items.push({
        id: row.id,
        filename: row.filename,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        processingStatus: row.processingStatus,
        extractedText: row.extractedText,
        extractSource: row.extractSource,
        errorMessage: row.errorMessage,
        extractedData:
          (pipeline?.data as Record<string, unknown> | null) ??
          (row.parsedJson as Record<string, unknown> | null) ??
          null,
        downloadable: existsSync(filePath),
      });
    }

    for (const att of parsed?.attachments ?? []) {
      if (seen.has(att.filename)) continue;
      items.push({
        id: null,
        filename: att.filename,
        mimeType: att.mimeType,
        sizeBytes: null,
        processingStatus: String(att.status),
        extractedText: null,
        extractSource: null,
        errorMessage: att.error ?? null,
        extractedData: (att.data as Record<string, unknown> | null) ?? null,
        downloadable: false,
      });
    }

    return this.success(items, null, 200);
  }

  async downloadAttachment(emailId: string, attachmentId: string): Promise<Response> {
    const emailCheck = emailIdSchema.safeParse(emailId);
    const attachmentCheck = emailIdSchema.safeParse(attachmentId);
    if (!emailCheck.success || !attachmentCheck.success) {
      return this.validationError("Invalid id", null);
    }

    const attRes = await this.ctx.services.attachment.byId(attachmentCheck.data);
    if (!attRes.success) {
      return this.fromDto(attRes);
    }
    const row = attRes.data;
    if (!row || row.emailId !== emailCheck.data) {
      return this.notFound("Attachment not found");
    }

    const filePath = resolveAttachmentLocalPath(row.localPath, this.deps.env.attachmentsRoot);
    if (!existsSync(filePath)) {
      return this.notFound("Attachment file not found on disk");
    }

    const file = Bun.file(filePath);
    return new Response(file, {
      headers: {
        "Content-Type": row.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(row.filename)}"`,
        "Cache-Control": "private, max-age=3600, immutable",
      },
    });
  }
}

async function handleEmailRouter(req: Request, deps: RestHandlerDeps): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const handler = new EmailHandler(deps);

  if (path === "/api/v1/emails/stats" && req.method === "GET") {
    return handler.stats();
  }

  if (path === "/api/v1/emails" && req.method === "GET") {
    return handler.list(url);
  }

  const match = path.match(/^\/api\/v1\/emails\/([^/]+)$/);
  if (match !== null && req.method === "GET") {
    return handler.byId(match[1]);
  }

  const extractedMatch = path.match(/^\/api\/v1\/emails\/([^/]+)\/extracted$/);
  if (extractedMatch !== null && req.method === "PATCH") {
    return handler.patchExtracted(extractedMatch[1], req);
  }

  const attachmentsMatch = path.match(/^\/api\/v1\/emails\/([^/]+)\/attachments$/);
  if (attachmentsMatch !== null && req.method === "GET") {
    return handler.listAttachments(attachmentsMatch[1]);
  }

  const downloadMatch = path.match(/^\/api\/v1\/emails\/([^/]+)\/attachments\/([^/]+)\/download$/);
  if (downloadMatch !== null && req.method === "GET") {
    return handler.downloadAttachment(downloadMatch[1], downloadMatch[2]);
  }

  return null;
}

export { handleEmailRouter };
