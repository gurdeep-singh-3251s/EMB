import type { RestHandlerDeps } from "@repo/types/restTypes";
import { BaseRestController } from "../helper/init";
import { getRequestTenantUserId } from "../requestContext";
import { getActivePlanId } from "../middleware/planLimits";
import { getWorkspaceMemberSummary } from "../../infra/workspaceIntegrations";

class WorkspaceHandler extends BaseRestController {
  async summary(): Promise<Response> {
    const userId = getRequestTenantUserId();
    if (!userId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }
    const member = await getWorkspaceMemberSummary(this.deps.getDb(), userId);
    const planId = await getActivePlanId(this.deps.getDb(), this.deps.env, userId);
    const seatLimit = planId === "enterprise" ? 25 : planId === "premium" ? 5 : planId === "standard" ? 3 : 1;

    return this.success(
      {
        planId,
        seats: { used: 1, limit: seatLimit, inviteComingSoon: seatLimit > 1 },
        members: member
          ? [{ id: member.id, email: member.email, name: member.name, role: "owner" as const }]
          : [],
      },
      null,
      200,
    );
  }
}

export async function handleWorkspaceRouter(req: Request, deps: RestHandlerDeps): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  if (path === "/api/v1/workspace" && req.method === "GET") {
    return new WorkspaceHandler(deps).summary();
  }
  return null;
}
