import type { Database } from "@repo/db";
import type { Env } from "@repo/config";
import type { PlanId } from "@repo/config/plans";
import { createExtractionServices } from "@repo/feature-extraction";
import type { EmailDetail } from "@repo/types/emailDetail";
import type { UserQueryRow } from "@repo/types/userQuery";
import { promptAbComparisons } from "@repo/db/schema";
import type { IClassificationService } from "@repo/feature-extraction";

type ClassifyEmailInput = Parameters<IClassificationService["classify"]>[0];

export type FieldDiff = {
  field: string;
  valueA: unknown;
  valueB: unknown;
  match: boolean;
};

export async function runPromptAbCompare(
  db: Database,
  env: Env,
  input: {
    ownerUserId: string;
    email: EmailDetail;
    promptA: UserQueryRow;
    promptB: UserQueryRow;
  },
): Promise<{
  id: string;
  relevantA: boolean;
  relevantB: boolean;
  extractedA: Record<string, unknown>;
  extractedB: Record<string, unknown>;
  fieldDiffs: FieldDiff[];
}> {
  const extraction = createExtractionServices({
    openRouter: env.openRouter,
    classifyModel: env.openRouter.classifyModel,
    extractModel: env.openRouter.extractModel,
    pipelineDebug: false,
    paddle: {
      attachmentsRoot: env.attachmentsRoot,
      apiMode: env.paddleOcr.apiMode,
      apiUrl: env.paddleOcr.apiUrl,
      apiToken: env.paddleOcr.apiToken,
      timeoutMs: env.paddleOcr.timeoutMs,
      pdfTextMinChars: env.paddleOcr.pdfTextMinChars,
      model: env.paddleOcr.model,
      pollIntervalMs: env.paddleOcr.pollIntervalMs,
      jobTimeoutMs: env.paddleOcr.jobTimeoutMs,
    },
  });

  const base: Omit<ClassifyEmailInput, "userQuery"> = {
    subject: input.email.subject ?? "",
    sender: input.email.sender ?? "",
    rawContent: input.email.rawContent ?? "",
    attachments: [],
    ownerUserId: input.ownerUserId,
  };

  const [resultA, resultB] = await Promise.all([
    extraction.classifyAndExtract.classifyAndExtract({ ...base, userQuery: input.promptA }),
    extraction.classifyAndExtract.classifyAndExtract({ ...base, userQuery: input.promptB }),
  ]);

  const extractedA = (resultA.parsed?.email ?? {}) as Record<string, unknown>;
  const extractedB = (resultB.parsed?.email ?? {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(extractedA), ...Object.keys(extractedB)]);
  const fieldDiffs: FieldDiff[] = [...keys].map((field) => {
    const valueA = extractedA[field] ?? null;
    const valueB = extractedB[field] ?? null;
    const match = JSON.stringify(valueA) === JSON.stringify(valueB);
    return { field, valueA, valueB, match };
  });

  const [row] = await db
    .insert(promptAbComparisons)
    .values({
      ownerUserId: input.ownerUserId,
      emailId: input.email.id,
      promptAId: input.promptA.id,
      promptBId: input.promptB.id,
      resultA: { classification: resultA.classification, extracted: extractedA },
      resultB: { classification: resultB.classification, extracted: extractedB },
      fieldDiffs,
    })
    .returning({ id: promptAbComparisons.id });

  return {
    id: row!.id,
    relevantA: resultA.classification.relevant,
    relevantB: resultB.classification.relevant,
    extractedA,
    extractedB,
    fieldDiffs,
  };
}

export function abCompareAllowed(planId: PlanId): boolean {
  return planId !== "free";
}
