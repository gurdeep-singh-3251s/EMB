import type { ProcessingStatus } from "./email";

export type ExtractionProgressPhase = "fetching" | "processing" | "complete";

export type UserQueryStatusCounts = {
  pending: number;
  processing: number;
  completed: number;
  partial: number;
  skipped: number;
  failed: number;
};

export type ExtractionProgressEvent =
  | {
      type: "phase";
      phase: ExtractionProgressPhase;
      userQueryId: string;
      at: string;
    }
  | {
      type: "fetch";
      imapFetched: number;
      enqueued: number;
      userQueryId: string;
      at: string;
    }
  | {
      type: "email";
      emailId: string;
      status: ProcessingStatus;
      userQueryId: string;
      at: string;
    }
  | {
      type: "snapshot";
      userQueryId: string;
      imapFetched: number;
      enqueued: number;
      total: number;
      statusCounts: UserQueryStatusCounts;
      at: string;
    };

export function extractionProgressChannel(userQueryId: string): string {
  return `extractpilot:progress:${userQueryId}`;
}
