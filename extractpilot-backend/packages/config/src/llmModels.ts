import type { PlanId } from "./plans";

export type LlmModelTier = "fast" | "balanced" | "quality" | "frontier";

export type LlmModelDefinition = {
  id: string;
  label: string;
  description: string;
  minPlan: PlanId;
  tier: LlmModelTier;
  /** Shown in UI — relative cost hint, not a price guarantee */
  costHint: string;
  /** Rough USD per 1M total tokens (OpenRouter varies) — for usage dashboard estimates */
  estUsdPer1MTokens: number;
  recommendedFor: "classify" | "extract" | "both";
};

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  standard: 1,
  premium: 2,
  enterprise: 3,
};

export const LLM_MODELS: LlmModelDefinition[] = [
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Default fast model — strong speed and comprehension on messy inboxes.",
    minPlan: "free",
    tier: "fast",
    costHint: "Lowest",
    estUsdPer1MTokens: 0.35,
    recommendedFor: "both",
  },
  {
    id: "qwen/qwen3.7-flash",
    label: "Qwen 3.7 Flash",
    description: "Alibaba fast reasoning model for high volume trials.",
    minPlan: "free",
    tier: "fast",
    costHint: "Lowest",
    estUsdPer1MTokens: 0.15,
    recommendedFor: "both",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    description: "Reliable classification with concise reasoning.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Medium",
    estUsdPer1MTokens: 0.5,
    recommendedFor: "classify",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o mini",
    description: "Solid extraction on semi-structured email and light tables.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Medium",
    estUsdPer1MTokens: 0.75,
    recommendedFor: "extract",
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    label: "Claude Sonnet 4.5",
    description: "Higher accuracy on complex attachments and nested fields.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Higher",
    estUsdPer1MTokens: 3.5,
    recommendedFor: "extract",
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    description: "Frontier-tier extraction for dense PDFs and multi-entity emails.",
    minPlan: "enterprise",
    tier: "frontier",
    costHint: "Highest",
    estUsdPer1MTokens: 6,
    recommendedFor: "extract",
  },
];

export type LlmEnvPolicy = {
  modelAllowlist: string[];
  onlyEnterpriseCanPickModels: boolean;
};

export function applyModelPolicy(models: LlmModelDefinition[], env: LlmEnvPolicy): LlmModelDefinition[] {
  if (env.modelAllowlist.length === 0) return models;
  const allowed = new Set(env.modelAllowlist);
  return models.filter((m) => allowed.has(m.id));
}

export function modelsForPlanWithPolicy(planId: PlanId, env: LlmEnvPolicy): LlmModelDefinition[] {
  return applyModelPolicy(modelsForPlan(planId), env);
}

export const DEFAULT_MODELS: Record<PlanId, { classify: string; extract: string }> = {
  free: { classify: "google/gemini-2.5-flash", extract: "google/gemini-2.5-flash" },
  standard: { classify: "google/gemini-2.5-flash", extract: "google/gemini-2.5-flash" },
  premium: { classify: "google/gemini-2.5-flash", extract: "openai/gpt-4o-mini" },
  enterprise: { classify: "anthropic/claude-haiku-4.5", extract: "openai/gpt-4o" },
};

export function modelDefinition(modelId: string): LlmModelDefinition | undefined {
  return LLM_MODELS.find((m) => m.id === modelId);
}

export function isModelAllowedForPlan(planId: PlanId, modelId: string): boolean {
  const def = modelDefinition(modelId);
  if (!def) return false;
  return PLAN_RANK[planId] >= PLAN_RANK[def.minPlan];
}

export function modelsForPlan(planId: PlanId): LlmModelDefinition[] {
  const rank = PLAN_RANK[planId];
  return LLM_MODELS.filter((m) => PLAN_RANK[m.minPlan] <= rank);
}

export function resolveModelsForPlan(
  planId: PlanId,
  input?: { classifyModel?: string | null; extractModel?: string | null },
  env?: LlmEnvPolicy,
): { classify: string; extract: string } {
  const defaults = DEFAULT_MODELS[planId];
  let classify = input?.classifyModel?.trim() || defaults.classify;
  let extract = input?.extractModel?.trim() || defaults.extract;

  if (env?.onlyEnterpriseCanPickModels && planId !== "enterprise") {
    classify = defaults.classify;
    extract = defaults.extract;
  }

  const catalog = env ? modelsForPlanWithPolicy(planId, env) : modelsForPlan(planId);
  const catalogIds = new Set(catalog.map((m) => m.id));

  if (!catalogIds.has(classify) || !isModelAllowedForPlan(planId, classify)) {
    throw new Error(`Classify model not available: ${classify}`);
  }
  if (!catalogIds.has(extract) || !isModelAllowedForPlan(planId, extract)) {
    throw new Error(`Extract model not available: ${extract}`);
  }
  return { classify, extract };
}

export function estimateTokenCostUsd(modelId: string, totalTokens: number): number {
  const def = modelDefinition(modelId);
  if (!def || totalTokens <= 0) return 0;
  return (totalTokens / 1_000_000) * def.estUsdPer1MTokens;
}
