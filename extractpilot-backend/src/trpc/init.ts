import { initTRPC, TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";
import { checkRateLimit } from "../rest/middleware/rateLimit";
import { getActivePlanId } from "../rest/middleware/planLimits";

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const requireAuth = t.middleware(({ ctx, next }) => {
  const configured = ctx.env.restApiKey?.trim();
  if (!configured || ctx.isAuthenticated) {
    return next();
  }
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Unauthorized — provide API key via Authorization: Bearer or X-API-Key",
  });
});

const rateLimit = t.middleware(async ({ ctx, next, path }) => {
  if (!ctx.redis) return next();
  const planId = await getActivePlanId(ctx.db, ctx.env);
  const rl = await checkRateLimit(ctx.redis, planId, "trpc", path);
  if (rl.limited) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded — max ${rl.limit} requests/minute on your plan.`,
    });
  }
  return next();
});

/** Authenticated + rate-limited (when REST_API_KEY is set). */
export const protectedProcedure = publicProcedure.use(requireAuth).use(rateLimit);
