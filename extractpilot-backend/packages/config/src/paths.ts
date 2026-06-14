import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Project root = directory containing package.json (no turborepo). */
export function findProjectRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 12; i++) {
    if (existsSync(resolve(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

export function resolveAttachmentsRoot(configured: string, startDir?: string): string {
  const root = findProjectRoot(startDir ?? dirname(fileURLToPath(import.meta.url)));
  if (configured.startsWith("/") || /^[A-Za-z]:\\/.test(configured)) return configured;
  return resolve(root, configured);
}

export function resolveAttachmentLocalPath(localPath: string, attachmentsRoot: string): string {
  if (localPath.startsWith("/") || /^[A-Za-z]:\\/.test(localPath)) return localPath;
  return resolve(attachmentsRoot, localPath);
}
