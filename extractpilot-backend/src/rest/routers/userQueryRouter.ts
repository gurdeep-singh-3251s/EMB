import type { RestUserQueryResultsData, RestHandlerDeps } from "@repo/types/restTypes";
import { PLANS } from "@repo/config/plans";
import { buildUserQueryResultsPayload } from "../helper/userQueryResults";
import { getActivePlanId } from "../middleware/planLimits";
import { BaseRestController } from "../helper/init";
import { createUserQueryBodySchema, userQueryResultsQuerySchema } from "../swagger/schemas";

class UserQueryHandler extends BaseRestController {
  async setUserQuery(req: Request): Promise<Response> {
    const body = await this.readJson(req);
    const parsed = createUserQueryBodySchema.safeParse(body);
    if (!parsed.success) {
      return this.validationError(parsed.error.message, parsed.error.flatten());
    }
    const planId = await getActivePlanId(this.deps.getDb(), this.deps.env);
    const maxFields = PLANS[planId].limits.maxSchemaFields;
    const fieldCount = Object.keys(parsed.data.outputSchema).length;
    if (fieldCount > maxFields) {
      return this.validationError(
        `Your ${PLANS[planId].name} plan allows up to ${maxFields} schema fields (${fieldCount} provided).`,
        null,
      );
    }
    const result = await this.ctx.services.userQuery.create(parsed.data);
    return this.fromDto(result, 201);
  }

  async getCurrentUserQuery(): Promise<Response> {
    const result = await this.ctx.services.userQuery.getActive();
    return this.fromDto(result);
  }

  async getCurrentUserQueryResults(url: URL): Promise<Response> {
    const active = await this.ctx.services.userQuery.getActive();
    if (!active.success) {
      return this.fromDto(active);
    }
    if (active.data === null) {
      return this.notFound("No active user query. Set one with POST /api/v1/user-query.");
    }
    return this.getUserQueryResults(active.data.id, url);
  }

  async getUserQueryResults(userQueryId: string, url: URL): Promise<Response> {
    const query = userQueryResultsQuerySchema.safeParse({
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
      timeRange: url.searchParams.get("timeRange"),
      includeInProgress: url.searchParams.get("includeInProgress"),
    });
    if (!query.success) {
      return this.validationError(query.error.message, query.error.flatten());
    }

    const result = await this.ctx.services.userQuery.listResults(userQueryId, {
      limit: query.data.limit,
      offset: query.data.offset,
      timeRange: query.data.timeRange,
      includeInProgress: query.data.includeInProgress,
    });
    if (!result.success) {
      return this.fromDto(result);
    }

    const page = result.data;
    const response = this.toUserQueryResultsPublic(buildUserQueryResultsPayload(page.items));
    const data: RestUserQueryResultsData = {
      userQueryId,
      timeRange: page.timeRange,
      limit: page.limit,
      offset: page.offset,
      total: page.total,
      count: response.count,
      completedCount: response.completedCount,
      hasMore: page.offset + response.count < page.total,
      statusCounts: page.statusCounts,
      extractedData: response.extractedData,
    };
    return this.success(data, null, 200);
  }
}

async function handleUserQueryRouter(req: Request, deps: RestHandlerDeps): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const handler = new UserQueryHandler(deps);

  if (path === "/api/v1/user-query" && req.method === "POST") {
    return handler.setUserQuery(req);
  }

  if (path === "/api/v1/user-query/current" && req.method === "GET") {
    return handler.getCurrentUserQuery();
  }

  if (path === "/api/v1/user-query/current/results" && req.method === "GET") {
    return handler.getCurrentUserQueryResults(url);
  }

  const match = path.match(/^\/api\/v1\/user-query\/([^/]+)\/results$/);
  if (match !== null && req.method === "GET") {
    const userQueryId = match[1];
    if (userQueryId === "current") {
      return null;
    }
    return handler.getUserQueryResults(userQueryId, url);
  }

  return null;
}

export { handleUserQueryRouter };
