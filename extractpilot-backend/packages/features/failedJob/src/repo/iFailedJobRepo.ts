import type { Database } from "@repo/db";

export interface FailedJobRow {
  id: string;
  emailId: string | null;
  errorMessage: string;
  retryCount: number;
  failedAt: Date;
}

export interface IFailedJobRepo {
  list(limit?: number): Promise<FailedJobRow[]>;
  create(emailId: string | null, errorMessage: string, retryCount: number): Promise<void>;
}

export type FailedJobRepoDeps = { db: Database };
