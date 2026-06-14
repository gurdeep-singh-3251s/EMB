import { router } from "../trpc/init";
import { attachmentRouter } from "../trpc/routers/attachmentRouter";
import { emailRouter } from "../trpc/routers/emailRouter";
import { failedJobRouter } from "../trpc/routers/failedJobRouter";
import { healthRouter } from "../trpc/routers/healthRouter";
import { userQueryRouter } from "../trpc/routers/userQueryRouter";
import { queueRouter } from "../trpc/routers/queueRouter";

export const appRouter = router({
  health: healthRouter,
  email: emailRouter,
  attachment: attachmentRouter,
  failedJob: failedJobRouter,
  queue: queueRouter,
  userQuery: userQueryRouter,
});

export type AppRouter = typeof appRouter;
