import type { AppContext } from "../appContext";
import { createDb } from "@repo/db";
import { createAttachmentService } from "@repo/feature-attachment";
import { createEmailService } from "@repo/feature-email";
import { createUserQueryService } from "@repo/feature-user-query";
import { createFailedJobService } from "@repo/feature-failed-job";
import { LazyQueueStatsService } from "@repo/feature-queue";
import type { Env } from "@repo/config";

export function createAppContext(env: Env, ownerUserId?: string | null): AppContext {
  const db = createDb(env.databaseUrl);

  return {
    db,
    services: {
      email: createEmailService(db, { ownerUserId }),
      attachment: createAttachmentService(db),
      failedJob: createFailedJobService(db),
      queue: new LazyQueueStatsService(env.redisUrl),
      userQuery: createUserQueryService(db, { ownerUserId }),
    },
  };
}
