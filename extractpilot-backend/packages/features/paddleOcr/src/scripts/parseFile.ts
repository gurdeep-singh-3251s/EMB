/**
 * Usage: bun --env-file=../../.env src/scripts/parseFile.ts path/to/document.pdf
 */
import { loadEnv } from "@repo/config";
import { createDocumentParserService } from "../index";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: bun src/scripts/parseFile.ts <file-path>");
  process.exit(1);
}

const env = loadEnv();
const parser = createDocumentParserService({
  apiMode: env.paddleOcr.apiMode,
  apiUrl: env.paddleOcr.apiUrl,
  apiToken: env.paddleOcr.apiToken,
  timeoutMs: env.paddleOcr.timeoutMs,
  pdfTextMinChars: env.paddleOcr.pdfTextMinChars,
  model: env.paddleOcr.model,
  pollIntervalMs: env.paddleOcr.pollIntervalMs,
  jobTimeoutMs: env.paddleOcr.jobTimeoutMs,
});
const result = await parser.parseFile({ localPath: filePath });

if (!result.success) {
  console.error("FAILED:", result.message);
  process.exit(1);
}

console.log(JSON.stringify(result.data, null, 2));
