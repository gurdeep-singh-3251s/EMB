import type { RestHandlerDeps } from "@repo/types/restTypes";
import {
  DEFAULT_MODELS,
  LLM_MODELS,
  modelsForPlanWithPolicy,
  resolveModelsForPlan,
} from "@repo/config/llmModels";
import type { PlanId } from "@repo/config/plans";
import { PLANS } from "@repo/config/plans";
import { eq, and, desc } from "drizzle-orm";
import { emails, promptAbComparisons } from "@repo/db/schema";
import { getActivePlanId } from "../middleware/planLimits";
import { BaseRestController } from "../helper/init";
import { getRequestTenantUserId } from "../requestContext";
import { enhanceExtractionPrompt } from "../services/promptEnhance";
import { abCompareAllowed, runPromptAbCompare } from "../services/promptAbCompare";
import { listPromptEnhancements } from "../../infra/promptEnhancementStore";
import { createUserQueryBodySchema } from "../swagger/schemas";
import { z } from "zod";

const enhanceBodySchema = z.object({
  userQuery: z.string().min(1).max(4000),
  goal: z.string().max(500).optional(),
  model: z.string().max(128).optional(),
  currentSchema: z.record(z.unknown()).optional(),
});

const abCompareBodySchema = z.object({
  emailId: z.string().uuid(),
  promptAId: z.string().uuid(),
  promptBId: z.string().uuid(),
});

class PromptStudioHandler extends BaseRestController {
  private async planId(): Promise<PlanId> {
    const tenantUserId = getRequestTenantUserId();
    return getActivePlanId(this.deps.getDb(), this.deps.env, tenantUserId);
  }

  async listModels(): Promise<Response> {
    const planId = await this.planId();
    const allowed = modelsForPlanWithPolicy(planId, this.deps.env.llm);
    const defaults = DEFAULT_MODELS[planId];
    return this.success(
      {
        planId,
        planName: PLANS[planId].name,
        defaults,
        models: allowed,
        catalog: LLM_MODELS,
        stats: {
          onPlan: allowed.length,
          availableOnPlan: allowed.filter((m) => m.available !== false).length,
          catalogTotal: LLM_MODELS.length,
        },
        policy: {
          modelAllowlist: this.deps.env.llm.modelAllowlist,
          onlyEnterpriseCanPickModels: this.deps.env.llm.onlyEnterpriseCanPickModels,
        },
      },
      null,
      200,
    );
  }

  async listPrompts(url: URL): Promise<Response> {
    const limit = Math.min(50, Number(url.searchParams.get("limit") ?? "30") || 30);
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);
    const result = await this.ctx.services.userQuery.list({ limit, offset });
    return this.fromDto(result);
  }

  async listEnhancements(): Promise<Response> {
    const tenantUserId = getRequestTenantUserId();
    if (!tenantUserId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }
    const items = await listPromptEnhancements(this.deps.getDb(), tenantUserId, 30);
    return this.success({ items }, null, 200);
  }

  async listAbHistory(): Promise<Response> {
    const tenantUserId = getRequestTenantUserId();
    if (!tenantUserId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }
    const rows = await this.deps
      .getDb()
      .select({
        id: promptAbComparisons.id,
        emailId: promptAbComparisons.emailId,
        promptAId: promptAbComparisons.promptAId,
        promptBId: promptAbComparisons.promptBId,
        fieldDiffs: promptAbComparisons.fieldDiffs,
        createdAt: promptAbComparisons.createdAt,
      })
      .from(promptAbComparisons)
      .where(eq(promptAbComparisons.ownerUserId, tenantUserId))
      .orderBy(desc(promptAbComparisons.createdAt))
      .limit(20);
    return this.success({ items: rows }, null, 200);
  }

  async activatePrompt(promptId: string): Promise<Response> {
    const owned = await this.ctx.services.userQuery.byId(promptId);
    if (!owned.success) return this.fromDto(owned);
    if (owned.data === null) return this.notFound("Prompt not found");
    const result = await this.ctx.services.userQuery.activate(promptId);
    return this.fromDto(result);
  }

  async enhance(req: Request): Promise<Response> {
    const body = await this.readJson(req);
    const parsed = enhanceBodySchema.safeParse(body);
    if (!parsed.success) {
      return this.validationError(parsed.error.message, parsed.error.flatten());
    }
    const planId = await this.planId();
    const tenantUserId = getRequestTenantUserId();
    const result = await enhanceExtractionPrompt(this.deps.env, planId, parsed.data, {
      db: this.deps.getDb(),
      ownerUserId: tenantUserId,
    });
    if (!result.ok) {
      return Response.json({ success: false, message: result.message, error: null }, { status: 400 });
    }
    return this.success(
      {
        userQuery: result.userQuery,
        rationale: result.rationale,
        modelUsed: result.modelUsed,
        outputSchema: result.outputSchema ?? null,
      },
      null,
      200,
    );
  }

  async abCompare(req: Request): Promise<Response> {
    const body = await this.readJson(req);
    const parsed = abCompareBodySchema.safeParse(body);
    if (!parsed.success) {
      return this.validationError(parsed.error.message, parsed.error.flatten());
    }
    const tenantUserId = getRequestTenantUserId();
    if (!tenantUserId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }
    const planId = await this.planId();
    if (!abCompareAllowed(planId)) {
      return this.validationError("A/B prompt compare requires Premium or higher.", null);
    }

    const [emailRow] = await this.deps
      .getDb()
      .select()
      .from(emails)
      .where(and(eq(emails.id, parsed.data.emailId), eq(emails.ownerUserId, tenantUserId)))
      .limit(1);
    if (!emailRow) return this.notFound("Email not found");

    const [promptA, promptB] = await Promise.all([
      this.ctx.services.userQuery.byId(parsed.data.promptAId),
      this.ctx.services.userQuery.byId(parsed.data.promptBId),
    ]);
    if (!promptA.success || !promptA.data || !promptB.success || !promptB.data) {
      return this.notFound("One or both prompts were not found");
    }

    const email = {
      id: emailRow.id,
      provider: emailRow.provider as "gmail",
      messageId: emailRow.messageId,
      sender: emailRow.sender,
      subject: emailRow.subject,
      processingStatus: emailRow.processingStatus as "completed",
      attachmentCount: emailRow.attachmentCount,
      createdAt: emailRow.createdAt,
      ownerUserId: emailRow.ownerUserId,
      rawContent: emailRow.rawContent,
      parsedJson: emailRow.parsedJson as import("@repo/types/parsedEmail").ParsedEmailResult | null,
    };

    try {
      const compared = await runPromptAbCompare(this.deps.getDb(), this.deps.env, {
        ownerUserId: tenantUserId,
        email,
        promptA: promptA.data,
        promptB: promptB.data,
      });
      return this.success(compared, null, 200);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Compare failed";
      return Response.json({ success: false, message, error: null }, { status: 502 });
    }
  }
}

class UserQueryCreateHandler extends BaseRestController {
  async createWithModels(req: Request): Promise<Response> {
    const body = await this.readJson(req);
    const parsed = createUserQueryBodySchema.safeParse(body);
    if (!parsed.success) {
      return this.validationError(parsed.error.message, parsed.error.flatten());
    }
    const tenantUserId = getRequestTenantUserId();
    if (!tenantUserId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }
    const planId = await getActivePlanId(this.deps.getDb(), this.deps.env, tenantUserId);
    const maxFields = PLANS[planId].limits.maxSchemaFields;
    const fieldCount = Object.keys(parsed.data.outputSchema).length;
    if (fieldCount > maxFields) {
      return this.validationError(
        `Your ${PLANS[planId].name} plan allows up to ${maxFields} schema fields (${fieldCount} provided).`,
        null,
      );
    }

    const resolved = resolveModelsForPlan(
      planId,
      {
        classifyModel: parsed.data.classifyModel,
        extractModel: parsed.data.extractModel,
      },
      this.deps.env.llm,
    );

    const result = await this.ctx.services.userQuery.create({
      ...parsed.data,
      classifyModel: resolved.classify,
      extractModel: resolved.extract,
    });
    if (!result.success) return this.fromDto(result, 201);

    const notes: string[] = [];
    if (resolved.fellBack.classify) notes.push(`Classify model unavailable — using ${resolved.classify}`);
    if (resolved.fellBack.extract) notes.push(`Extract model unavailable — using ${resolved.extract}`);
    const message = notes.length > 0 ? notes.join(". ") : null;
    return this.success(result.data, message, 201);
  }
}

export async function handlePromptStudioRouter(req: Request, deps: RestHandlerDeps): Promise<Response | null> {
  const path = new URL(req.url).pathname;

  if (path === "/api/v1/llm-models" && req.method === "GET") {
    return new PromptStudioHandler(deps).listModels();
  }

  if (path === "/api/v1/user-queries" && req.method === "GET") {
    return new PromptStudioHandler(deps).listPrompts(new URL(req.url));
  }

  if (path === "/api/v1/prompt-studio/enhancements" && req.method === "GET") {
    return new PromptStudioHandler(deps).listEnhancements();
  }

  if (path === "/api/v1/prompt-studio/ab-history" && req.method === "GET") {
    return new PromptStudioHandler(deps).listAbHistory();
  }

  if (path === "/api/v1/prompt-studio/enhance" && req.method === "POST") {
    return new PromptStudioHandler(deps).enhance(req);
  }

  if (path === "/api/v1/prompt-studio/ab-compare" && req.method === "POST") {
    return new PromptStudioHandler(deps).abCompare(req);
  }

  const activateMatch = path.match(/^\/api\/v1\/user-queries\/([^/]+)\/activate$/);
  if (activateMatch && req.method === "POST") {
    return new PromptStudioHandler(deps).activatePrompt(activateMatch[1]);
  }

  return null;
}

/** Extended create validation — used from userQuery router */
export { UserQueryCreateHandler };
