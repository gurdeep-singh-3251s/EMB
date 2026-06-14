import { desc } from "drizzle-orm";
import { failedJobs } from "@repo/db/schema";
import type { FailedJobRepoDeps, FailedJobRow, IFailedJobRepo } from "./iFailedJobRepo";

export class FailedJobRepo implements IFailedJobRepo {
  constructor(private readonly deps: FailedJobRepoDeps) {}

  async list(limit = 50): Promise<FailedJobRow[]> {
    return this.deps.db.select().from(failedJobs).orderBy(desc(failedJobs.failedAt)).limit(limit);
  }

  async create(emailId: string | null, errorMessage: string, retryCount: number): Promise<void> {
    await this.deps.db.insert(failedJobs).values({ emailId, errorMessage, retryCount });
  }
}
