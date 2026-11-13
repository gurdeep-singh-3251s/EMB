import { PROMPT_TEMPLATES } from "@repo/config/promptTemplates";
import type { RestHandlerDeps } from "@repo/types/restTypes";
import { BaseRestController } from "../helper/init";
import { cacheGet, cacheSet, tenantCacheKey } from "../../infra/redisCache";

class PromptTemplatesHandler extends BaseRestController {
  async list(): Promise<Response> {
    const redis = this.deps.getRedis();
    const cacheKey = tenantCacheKey("prompt-templates", null);
    const cached = await cacheGet<{ templates: typeof PROMPT_TEMPLATES }>(redis, cacheKey);
    if (cached) {
      const res = this.success(cached, null, 200);
      res.headers.set("X-Cache", "HIT");
      return res;
    }

    const body = { templates: PROMPT_TEMPLATES };
    await cacheSet(redis, cacheKey, body, this.deps.env.cachePublicTtlSeconds);
    const res = this.success(body, null, 200);
    res.headers.set("X-Cache", "MISS");
    return res;
  }
}

export async function handlePromptTemplatesRouter(
  req: Request,
  deps: RestHandlerDeps,
): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  if (path === "/api/v1/prompt-templates" && req.method === "GET") {
    return await new PromptTemplatesHandler(deps).list();
  }
  return null;
}
