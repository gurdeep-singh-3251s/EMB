import type { Database } from "@repo/db";
import type { IAttachmentService } from "@repo/feature-attachment";
import type { IEmailService } from "@repo/feature-email";
import type { IFailedJobService } from "@repo/feature-failed-job";
import type { IUserQueryService } from "@repo/feature-user-query";
import type { IQueueStatsService } from "@repo/feature-queue";

export interface AppContext {
  db: Database;
  services: {
    email: IEmailService;
    attachment: IAttachmentService;
    failedJob: IFailedJobService;
    queue: IQueueStatsService;
    userQuery: IUserQueryService;
  };
}

export type CreateContextFn = () => Promise<AppContext> | AppContext;
