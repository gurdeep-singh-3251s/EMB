import { z } from "zod";
import { protectedProcedure, router } from "../init";

export const attachmentRouter = router({
  byEmailId: protectedProcedure.input(z.object({ emailId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return await ctx.services.attachment.byEmailId(input.emailId);
  }),
});

