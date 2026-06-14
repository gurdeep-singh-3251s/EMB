import { eq } from "drizzle-orm";
import { emailAttachments } from "@repo/db/schema";
import type { AttachmentRepoDeps, EmailAttachmentRow, IAttachmentRepo } from "./iAttachmentRepo";

export class AttachmentRepo implements IAttachmentRepo {
  constructor(private readonly deps: AttachmentRepoDeps) {}

  async byEmailId(emailId: string): Promise<EmailAttachmentRow[]> {
    return this.deps.db.select().from(emailAttachments).where(eq(emailAttachments.emailId, emailId));
  }

  async byId(id: string): Promise<EmailAttachmentRow | null> {
    const [row] = await this.deps.db.select().from(emailAttachments).where(eq(emailAttachments.id, id)).limit(1);
    return row ?? null;
  }

  async saveAttachments(
    emailId: string,
    items: Array<{
      filename: string;
      mimeType: string;
      sizeBytes: number;
      localPath: string;
    }>,
  ): Promise<void> {
    if (items.length === 0) return;
    await this.deps.db
      .insert(emailAttachments)
      .values(
        items.map((i) => ({
          emailId,
          filename: i.filename,
          mimeType: i.mimeType,
          sizeBytes: i.sizeBytes,
          localPath: i.localPath,
          processingStatus: "pending",
        })),
      )
      .onConflictDoNothing();
  }

  async insertManyForEmails(
    items: Array<{
      emailId: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      localPath: string;
    }>,
  ): Promise<void> {
    if (items.length === 0) return;
    await this.deps.db
      .insert(emailAttachments)
      .values(
        items.map((i) => ({
          emailId: i.emailId,
          filename: i.filename,
          mimeType: i.mimeType,
          sizeBytes: i.sizeBytes,
          localPath: i.localPath,
          processingStatus: "pending",
        })),
      )
      .onConflictDoNothing();
  }

  async updateParsed(
    id: string,
    data: { processingStatus: string; parsedJson?: Record<string, unknown> | null; errorMessage?: string },
  ): Promise<void> {
    await this.deps.db.update(emailAttachments).set(data).where(eq(emailAttachments.id, id));
  }

  async saveExtractedText(
    id: string,
    data: { extractedText: string; extractSource: string; processingStatus?: string },
  ): Promise<void> {
    await this.deps.db
      .update(emailAttachments)
      .set({
        extractedText: data.extractedText,
        extractSource: data.extractSource,
        ...(data.processingStatus ? { processingStatus: data.processingStatus } : {}),
      })
      .where(eq(emailAttachments.id, id));
  }
}
