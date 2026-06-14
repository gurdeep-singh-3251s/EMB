import { z } from "zod";
import { protectedProcedure, router } from "../init";

const fieldSpecSchema = z.object({
  type: z.enum(["string", "number", "boolean", "enum", "array", "object"]),
  nullable: z.boolean().optional(),
  description: z.string().optional(),
  values: z.array(z.string()).optional(),
});

export const userQueryRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        userQuery: z.string().min(1).max(4000),
        outputSchema: z.record(fieldSpecSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.services.userQuery.create(input);
    }),

  active: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.services.userQuery.getActive();
  }),

  results: protectedProcedure
    .input(
      z.object({
        userQueryId: z.string().uuid(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
        timeRange: z.enum(["1hour", "1day", "1week", "1month", "all"]).optional(),
        includeInProgress: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.services.userQuery.listResults(input.userQueryId, {
        limit: input.limit,
        offset: input.offset,
        timeRange: input.timeRange,
        includeInProgress: input.includeInProgress,
      });
    }),
});
