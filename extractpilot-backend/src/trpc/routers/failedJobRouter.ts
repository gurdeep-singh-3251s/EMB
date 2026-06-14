import { z } from "zod";
import { protectedProcedure, router } from "../init";

export const failedJobRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await ctx.services.failedJob.list(input?.limit);
    }),
});

