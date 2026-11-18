import { z } from "zod";
import type { RestHandlerDeps } from "@repo/types/restTypes";
import { BaseRestController } from "../helper/init";
import { getRequestTenantUserId } from "../requestContext";
import {
  getWorkspaceIntegrations,
  listWorkspaceAudit,
  recordWorkspaceAudit,
  upsertWorkspaceIntegrations,
} from "../../infra/workspaceIntegrations";

const patchSchema = z.object({
  webhookUrl: z.union([z.string().url().max(2000), z.literal(""), z.null()]).optional(),
  slackWebhookUrl: z.union([z.string().url().max(2000), z.literal(""), z.null()]).optional(),
  notifyOnExtractionCompleted: z.boolean().optional(),
  notifyOnFailure: z.boolean().optional(),
});

class IntegrationsHandler extends BaseRestController {
  async getIntegrations(): Promise<Response> {
    const userId = getRequestTenantUserId();
    if (!userId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }
    const row = await getWorkspaceIntegrations(this.deps.getDb(), userId);
    return this.success(row, null, 200);
  }

  async patchIntegrations(req: Request): Promise<Response> {
    const userId = getRequestTenantUserId();
    if (!userId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }
    const body = await this.readJson(req);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return this.validationError("Invalid integrations payload", parsed.error.flatten());
    }
    const patch = {
      ...parsed.data,
      webhookUrl:
        parsed.data.webhookUrl === "" || parsed.data.webhookUrl === null
          ? null
          : parsed.data.webhookUrl,
      slackWebhookUrl:
        parsed.data.slackWebhookUrl === "" || parsed.data.slackWebhookUrl === null
          ? null
          : parsed.data.slackWebhookUrl,
    };
    const row = await upsertWorkspaceIntegrations(this.deps.getDb(), userId, patch);
    await recordWorkspaceAudit(this.deps.getDb(), userId, "integrations.updated", {
      hasWebhook: Boolean(row.webhookUrl),
      hasSlack: Boolean(row.slackWebhookUrl),
    });
    return this.success(row, "Integrations saved", 200);
  }

  async listAudit(url: URL): Promise<Response> {
    const userId = getRequestTenantUserId();
    if (!userId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }
    const limit = Math.min(200, Number(url.searchParams.get("limit") ?? "50") || 50);
    const rows = await listWorkspaceAudit(this.deps.getDb(), userId, limit);
    return this.success(
      {
        items: rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      },
      null,
      200,
    );
  }
}

export async function handleIntegrationsRouter(req: Request, deps: RestHandlerDeps): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const handler = new IntegrationsHandler(deps);

  if (path === "/api/v1/integrations" && req.method === "GET") {
    return handler.getIntegrations();
  }
  if (path === "/api/v1/integrations" && req.method === "PATCH") {
    return handler.patchIntegrations(req);
  }
  if (path === "/api/v1/audit-log" && req.method === "GET") {
    return handler.listAudit(url);
  }
  return null;
}
