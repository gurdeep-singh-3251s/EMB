import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { EmailAttachment, EmailProvider } from "@repo/types/email";
import type { IAttachmentStorageService } from "./iAttachmentStorageService";

/** Safe for Windows/macOS/Linux path segments (messageId, filenames). */
export function sanitizePathSegment(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 200);
}

export class AttachmentStorageService implements IAttachmentStorageService {
  constructor(
    private readonly root: string,
    private readonly maxSizeMb: number,
    private readonly maxCount: number,
  ) {}

  async saveAll(
    provider: EmailProvider,
    messageId: string,
    files: Array<{ filename: string; mimeType: string; content: Buffer }>,
  ): Promise<EmailAttachment[]> {
    const dir = resolve(this.root, provider, sanitizePathSegment(messageId));
    await mkdir(dir, { recursive: true });

    const maxBytes = this.maxSizeMb * 1024 * 1024;
    const slice = files.slice(0, this.maxCount);
    const saved: EmailAttachment[] = [];

    for (let i = 0; i < slice.length; i++) {
      const file = slice[i]!;
      if (file.content.length > maxBytes) continue;

      const name = `${i}_${sanitizePathSegment(file.filename || `attachment-${i}`)}`;
      const localPath = resolve(dir, name);
      await writeFile(localPath, file.content);

      saved.push({
        filename: file.filename || name,
        mimeType: file.mimeType,
        sizeBytes: file.content.length,
        localPath,
        contentId: null,
      });
    }

    return saved;
  }
}
