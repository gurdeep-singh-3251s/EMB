import { ProcessingStatus } from "@repo/types/email";
import { z } from "zod";
import { protectedProcedure, router } from "../init";

export const emailRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
          status: z.nativeEnum(ProcessingStatus).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.services.email.list(input ?? {});
    }),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return await ctx.services.email.byId(input.id);
  }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.services.email.stats();
  }),
});

