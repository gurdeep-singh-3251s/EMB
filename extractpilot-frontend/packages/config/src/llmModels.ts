import type { PlanId } from "./plans";

export type LlmModelTier = "fast" | "balanced" | "quality" | "frontier";

export type LlmModelDefinition = {
  id: string;
  label: string;
  description: string;
  minPlan: PlanId;
  tier: LlmModelTier;
  costHint: string;
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
    recommendedFor: "both",
  },
  {
    id: "qwen/qwen3.7-flash",
    label: "Qwen 3.7 Flash",
    description: "Alibaba fast reasoning model for high volume trials.",
    minPlan: "free",
    tier: "fast",
    costHint: "Lowest",
    recommendedFor: "both",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    description: "Reliable classification with concise reasoning.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Medium",
    recommendedFor: "classify",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o mini",
    description: "Solid extraction on semi-structured email and light tables.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Medium",
    recommendedFor: "extract",
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    label: "Claude Sonnet 4.5",
    description: "Higher accuracy on complex attachments and nested fields.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Higher",
    recommendedFor: "extract",
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    description: "Frontier-tier extraction for dense PDFs and multi-entity emails.",
    minPlan: "enterprise",
    tier: "frontier",
    costHint: "Highest",
    recommendedFor: "extract",
  },
];

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
