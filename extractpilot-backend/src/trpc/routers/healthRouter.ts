import { publicProcedure, router } from "../init";

export const healthRouter = router({
  ping: publicProcedure.query(() => ({ ok: true, service: "email-parser-api" })),
});

