import { protectedProcedure, router } from "../init";

export const queueRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.services.queue.summary();
  }),
});

