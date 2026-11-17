import type { PlanId } from "./plans";

export type LlmModelTier = "fast" | "balanced" | "quality" | "frontier";

export type LlmModelDefinition = {
  id: string;
  label: string;
  description: string;
  minPlan: PlanId;
  tier: LlmModelTier;
  costHint: string;
  estUsdPer1MTokens: number;
  recommendedFor: "classify" | "extract" | "both";
  /** Soft availability — UI still lists it; runtime falls back if false */
  available?: boolean;
  provider: string;
};

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  standard: 1,
  premium: 2,
  enterprise: 3,
};

function m(
  partial: Omit<LlmModelDefinition, "available"> & { available?: boolean },
): LlmModelDefinition {
  return { available: true, ...partial };
}

/** ~50 OpenRouter-routable models for demo + production selection. */
export const LLM_MODELS: LlmModelDefinition[] = [
  // Free / fast
  m({
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Default fast model for inbox triage and extraction.",
    minPlan: "free",
    tier: "fast",
    costHint: "Lowest",
    estUsdPer1MTokens: 0.35,
    recommendedFor: "both",
    provider: "Google",
  }),
  m({
    id: "google/gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    description: "Previous-gen Gemini flash — high volume.",
    minPlan: "free",
    tier: "fast",
    costHint: "Lowest",
    estUsdPer1MTokens: 0.3,
    recommendedFor: "both",
    provider: "Google",
  }),
  m({
    id: "google/gemini-flash-1.5",
    label: "Gemini 1.5 Flash",
    description: "Lightweight Gemini for quick classify passes.",
    minPlan: "free",
    tier: "fast",
    costHint: "Lowest",
    estUsdPer1MTokens: 0.2,
    recommendedFor: "classify",
    provider: "Google",
  }),
  m({
    id: "qwen/qwen3-8b",
    label: "Qwen 3 8B",
    description: "Open fast model for trials and high throughput.",
    minPlan: "free",
    tier: "fast",
    costHint: "Lowest",
    estUsdPer1MTokens: 0.12,
    recommendedFor: "both",
    provider: "Alibaba",
  }),
  m({
    id: "qwen/qwen-2.5-7b-instruct",
    label: "Qwen 2.5 7B",
    description: "Compact instruct model for simple schemas.",
    minPlan: "free",
    tier: "fast",
    costHint: "Lowest",
    estUsdPer1MTokens: 0.1,
    recommendedFor: "both",
    provider: "Alibaba",
  }),
  m({
    id: "meta-llama/llama-3.1-8b-instruct",
    label: "Llama 3.1 8B",
    description: "Meta open model — good baseline extraction.",
    minPlan: "free",
    tier: "fast",
    costHint: "Lowest",
    estUsdPer1MTokens: 0.12,
    recommendedFor: "both",
    provider: "Meta",
  }),
  m({
    id: "meta-llama/llama-3.2-3b-instruct",
    label: "Llama 3.2 3B",
    description: "Ultra-light classify helper.",
    minPlan: "free",
    tier: "fast",
    costHint: "Lowest",
    estUsdPer1MTokens: 0.06,
    recommendedFor: "classify",
    provider: "Meta",
  }),
  m({
    id: "mistralai/mistral-7b-instruct",
    label: "Mistral 7B Instruct",
    description: "Efficient EU-hosted friendly option.",
    minPlan: "free",
    tier: "fast",
    costHint: "Lowest",
    estUsdPer1MTokens: 0.14,
    recommendedFor: "both",
    provider: "Mistral",
  }),
  m({
    id: "microsoft/phi-3.5-mini-128k-instruct",
    label: "Phi 3.5 Mini",
    description: "Microsoft small model for simple fields.",
    minPlan: "free",
    tier: "fast",
    costHint: "Lowest",
    estUsdPer1MTokens: 0.1,
    recommendedFor: "classify",
    provider: "Microsoft",
  }),
  m({
    id: "deepseek/deepseek-chat",
    label: "DeepSeek Chat",
    description: "Cost-efficient general chat extraction.",
    minPlan: "free",
    tier: "fast",
    costHint: "Low",
    estUsdPer1MTokens: 0.2,
    recommendedFor: "both",
    provider: "DeepSeek",
  }),

  // Standard / balanced — unlocks 20+ total when combined with free
  m({
    id: "anthropic/claude-3-haiku",
    label: "Claude 3 Haiku",
    description: "Fast Anthropic classify for lead / listing emails.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Low–medium",
    estUsdPer1MTokens: 0.4,
    recommendedFor: "classify",
    provider: "Anthropic",
  }),
  m({
    id: "anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    description: "Newer Haiku — concise real-estate triage.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Medium",
    estUsdPer1MTokens: 0.5,
    recommendedFor: "classify",
    provider: "Anthropic",
  }),
  m({
    id: "openai/gpt-4o-mini",
    label: "GPT-4o mini",
    description: "Strong mid-tier extract for offers & contracts summaries.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Medium",
    estUsdPer1MTokens: 0.75,
    recommendedFor: "extract",
    provider: "OpenAI",
  }),
  m({
    id: "openai/gpt-4.1-mini",
    label: "GPT-4.1 mini",
    description: "Newer mini — better schema adherence.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Medium",
    estUsdPer1MTokens: 0.8,
    recommendedFor: "both",
    provider: "OpenAI",
  }),
  m({
    id: "openai/gpt-4.1-nano",
    label: "GPT-4.1 nano",
    description: "Cheap OpenAI nano for high-volume classify.",
    minPlan: "standard",
    tier: "fast",
    costHint: "Low",
    estUsdPer1MTokens: 0.25,
    recommendedFor: "classify",
    provider: "OpenAI",
  }),
  m({
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Deeper Gemini for long listing threads.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Medium",
    estUsdPer1MTokens: 2.5,
    recommendedFor: "extract",
    provider: "Google",
  }),
  m({
    id: "google/gemini-2.0-flash-lite",
    label: "Gemini 2.0 Flash Lite",
    description: "Lite flash for mailbox routing.",
    minPlan: "standard",
    tier: "fast",
    costHint: "Lowest",
    estUsdPer1MTokens: 0.18,
    recommendedFor: "classify",
    provider: "Google",
  }),
  m({
    id: "meta-llama/llama-3.1-70b-instruct",
    label: "Llama 3.1 70B",
    description: "Open mid-large model for complex schemas.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Medium",
    estUsdPer1MTokens: 0.9,
    recommendedFor: "both",
    provider: "Meta",
  }),
  m({
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    description: "Updated 70B instruct for extraction quality.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Medium",
    estUsdPer1MTokens: 0.95,
    recommendedFor: "extract",
    provider: "Meta",
  }),
  m({
    id: "mistralai/mistral-small-3.1-24b-instruct",
    label: "Mistral Small 3.1",
    description: "Balanced Mistral for CRM field fills.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Medium",
    estUsdPer1MTokens: 0.55,
    recommendedFor: "both",
    provider: "Mistral",
  }),
  m({
    id: "mistralai/mixtral-8x7b-instruct",
    label: "Mixtral 8x7B",
    description: "Mixture-of-experts for varied inbox language.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Low–medium",
    estUsdPer1MTokens: 0.45,
    recommendedFor: "both",
    provider: "Mistral",
  }),
  m({
    id: "deepseek/deepseek-r1",
    label: "DeepSeek R1",
    description: "Reasoning-oriented DeepSeek for ambiguous emails.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Medium",
    estUsdPer1MTokens: 1.2,
    recommendedFor: "extract",
    provider: "DeepSeek",
  }),
  m({
    id: "cohere/command-r",
    label: "Cohere Command R",
    description: "RAG-friendly model for document-ish emails.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Medium",
    estUsdPer1MTokens: 0.7,
    recommendedFor: "both",
    provider: "Cohere",
  }),
  m({
    id: "cohere/command-r-plus",
    label: "Cohere Command R+",
    description: "Higher quality Cohere for structured deals.",
    minPlan: "standard",
    tier: "quality",
    costHint: "Higher",
    estUsdPer1MTokens: 2.2,
    recommendedFor: "extract",
    provider: "Cohere",
  }),
  m({
    id: "amazon/nova-lite-v1",
    label: "Amazon Nova Lite",
    description: "AWS Nova lite for cost-aware teams.",
    minPlan: "standard",
    tier: "fast",
    costHint: "Low",
    estUsdPer1MTokens: 0.3,
    recommendedFor: "both",
    provider: "Amazon",
  }),
  m({
    id: "amazon/nova-micro-v1",
    label: "Amazon Nova Micro",
    description: "Tiny Nova for classify-only passes.",
    minPlan: "standard",
    tier: "fast",
    costHint: "Lowest",
    estUsdPer1MTokens: 0.08,
    recommendedFor: "classify",
    provider: "Amazon",
  }),
  m({
    id: "x-ai/grok-2-1212",
    label: "Grok 2",
    description: "xAI Grok for conversational lead emails.",
    minPlan: "standard",
    tier: "balanced",
    costHint: "Medium",
    estUsdPer1MTokens: 1.5,
    recommendedFor: "both",
    provider: "xAI",
  }),
  m({
    id: "x-ai/grok-2-mini",
    label: "Grok 2 Mini",
    description: "Faster Grok mini variant.",
    minPlan: "standard",
    tier: "fast",
    costHint: "Low–medium",
    estUsdPer1MTokens: 0.6,
    recommendedFor: "classify",
    provider: "xAI",
  }),

  // Premium / quality
  m({
    id: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4",
    description: "High accuracy on contracts and escrow threads.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Higher",
    estUsdPer1MTokens: 3.5,
    recommendedFor: "extract",
    provider: "Anthropic",
  }),
  m({
    id: "anthropic/claude-sonnet-4.5",
    label: "Claude Sonnet 4.5",
    description: "Latest Sonnet for dense MLS / legal language.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Higher",
    estUsdPer1MTokens: 3.8,
    recommendedFor: "extract",
    provider: "Anthropic",
  }),
  m({
    id: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    description: "Proven Sonnet for production extractions.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Higher",
    estUsdPer1MTokens: 3.2,
    recommendedFor: "both",
    provider: "Anthropic",
  }),
  m({
    id: "openai/gpt-4o",
    label: "GPT-4o",
    description: "Frontier OpenAI multimodal-capable extract.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Higher",
    estUsdPer1MTokens: 6,
    recommendedFor: "extract",
    provider: "OpenAI",
  }),
  m({
    id: "openai/gpt-4.1",
    label: "GPT-4.1",
    description: "Strong schema fidelity for closing packages.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Higher",
    estUsdPer1MTokens: 5.5,
    recommendedFor: "extract",
    provider: "OpenAI",
  }),
  m({
    id: "openai/o3-mini",
    label: "o3 mini",
    description: "Reasoning mini for edge-case deal emails.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Higher",
    estUsdPer1MTokens: 4.5,
    recommendedFor: "extract",
    provider: "OpenAI",
  }),
  m({
    id: "google/gemini-2.5-flash-preview-05-20",
    label: "Gemini 2.5 Flash Preview",
    description: "Preview flash channel — may rotate.",
    minPlan: "premium",
    tier: "fast",
    costHint: "Low",
    estUsdPer1MTokens: 0.4,
    recommendedFor: "both",
    provider: "Google",
    available: false,
  }),
  m({
    id: "mistralai/mistral-large-2411",
    label: "Mistral Large",
    description: "Mistral large for multilingual listings.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Higher",
    estUsdPer1MTokens: 3,
    recommendedFor: "extract",
    provider: "Mistral",
  }),
  m({
    id: "mistralai/mistral-medium-3",
    label: "Mistral Medium 3",
    description: "Mid-large Mistral for brokerage ops.",
    minPlan: "premium",
    tier: "balanced",
    costHint: "Medium",
    estUsdPer1MTokens: 1.4,
    recommendedFor: "both",
    provider: "Mistral",
  }),
  m({
    id: "amazon/nova-pro-v1",
    label: "Amazon Nova Pro",
    description: "AWS Nova Pro for enterprise AWS shops.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Higher",
    estUsdPer1MTokens: 2.8,
    recommendedFor: "extract",
    provider: "Amazon",
  }),
  m({
    id: "perplexity/sonar",
    label: "Perplexity Sonar",
    description: "Search-augmented style model for market notes.",
    minPlan: "premium",
    tier: "balanced",
    costHint: "Medium",
    estUsdPer1MTokens: 1.1,
    recommendedFor: "classify",
    provider: "Perplexity",
  }),
  m({
    id: "perplexity/sonar-pro",
    label: "Perplexity Sonar Pro",
    description: "Higher Perplexity tier for research-heavy mail.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Higher",
    estUsdPer1MTokens: 2.5,
    recommendedFor: "extract",
    provider: "Perplexity",
  }),
  m({
    id: "qwen/qwen-2.5-72b-instruct",
    label: "Qwen 2.5 72B",
    description: "Large Qwen for complex nested schemas.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Medium–high",
    estUsdPer1MTokens: 1.3,
    recommendedFor: "extract",
    provider: "Alibaba",
  }),
  m({
    id: "qwen/qwq-32b",
    label: "QwQ 32B",
    description: "Qwen reasoning model for ambiguous deals.",
    minPlan: "premium",
    tier: "quality",
    costHint: "Medium",
    estUsdPer1MTokens: 1.1,
    recommendedFor: "extract",
    provider: "Alibaba",
  }),

  // Enterprise / frontier
  m({
    id: "anthropic/claude-opus-4",
    label: "Claude Opus 4",
    description: "Top Anthropic quality for legal / escrow packs.",
    minPlan: "enterprise",
    tier: "frontier",
    costHint: "Highest",
    estUsdPer1MTokens: 18,
    recommendedFor: "extract",
    provider: "Anthropic",
  }),
  m({
    id: "anthropic/claude-3-opus",
    label: "Claude 3 Opus",
    description: "Classic Opus for maximum comprehension.",
    minPlan: "enterprise",
    tier: "frontier",
    costHint: "Highest",
    estUsdPer1MTokens: 20,
    recommendedFor: "extract",
    provider: "Anthropic",
  }),
  m({
    id: "openai/o1",
    label: "OpenAI o1",
    description: "Deep reasoning for rare edge-case extractions.",
    minPlan: "enterprise",
    tier: "frontier",
    costHint: "Highest",
    estUsdPer1MTokens: 25,
    recommendedFor: "extract",
    provider: "OpenAI",
  }),
  m({
    id: "openai/o1-pro",
    label: "OpenAI o1 Pro",
    description: "Pro reasoning tier — use sparingly.",
    minPlan: "enterprise",
    tier: "frontier",
    costHint: "Highest",
    estUsdPer1MTokens: 40,
    recommendedFor: "extract",
    provider: "OpenAI",
    available: false,
  }),
  m({
    id: "openai/gpt-4-turbo",
    label: "GPT-4 Turbo",
    description: "Legacy turbo — still strong on long threads.",
    minPlan: "enterprise",
    tier: "frontier",
    costHint: "High",
    estUsdPer1MTokens: 12,
    recommendedFor: "extract",
    provider: "OpenAI",
  }),
  m({
    id: "google/gemini-2.5-pro-preview",
    label: "Gemini 2.5 Pro Preview",
    description: "Preview Pro channel — may be rotated.",
    minPlan: "enterprise",
    tier: "frontier",
    costHint: "High",
    estUsdPer1MTokens: 5,
    recommendedFor: "both",
    provider: "Google",
    available: false,
  }),
  m({
    id: "x-ai/grok-3-beta",
    label: "Grok 3 Beta",
    description: "Latest Grok beta for enterprise trials.",
    minPlan: "enterprise",
    tier: "frontier",
    costHint: "High",
    estUsdPer1MTokens: 8,
    recommendedFor: "extract",
    provider: "xAI",
  }),
  m({
    id: "meta-llama/llama-4-maverick",
    label: "Llama 4 Maverick",
    description: "Next-gen Llama class model when routed.",
    minPlan: "enterprise",
    tier: "frontier",
    costHint: "High",
    estUsdPer1MTokens: 4,
    recommendedFor: "both",
    provider: "Meta",
  }),
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
  standard: { classify: "google/gemini-2.5-flash", extract: "openai/gpt-4o-mini" },
  premium: { classify: "anthropic/claude-haiku-4.5", extract: "anthropic/claude-sonnet-4.5" },
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

export function isModelSelectable(modelId: string, planId: PlanId, env?: LlmEnvPolicy): boolean {
  const catalog = env ? modelsForPlanWithPolicy(planId, env) : modelsForPlan(planId);
  const hit = catalog.find((m) => m.id === modelId);
  return Boolean(hit && hit.available !== false && isModelAllowedForPlan(planId, modelId));
}

/** Prefer requested models; silently fall back to plan defaults when unavailable. */
export function resolveModelsForPlan(
  planId: PlanId,
  input?: { classifyModel?: string | null; extractModel?: string | null },
  env?: LlmEnvPolicy,
): { classify: string; extract: string; fellBack: { classify: boolean; extract: boolean } } {
  const defaults = DEFAULT_MODELS[planId];
  let classify = input?.classifyModel?.trim() || defaults.classify;
  let extract = input?.extractModel?.trim() || defaults.extract;

  if (env?.onlyEnterpriseCanPickModels && planId !== "enterprise") {
    return { classify: defaults.classify, extract: defaults.extract, fellBack: { classify: true, extract: true } };
  }

  const fellBack = { classify: false, extract: false };

  if (!isModelSelectable(classify, planId, env)) {
    classify = defaults.classify;
    fellBack.classify = true;
  }
  if (!isModelSelectable(extract, planId, env)) {
    extract = defaults.extract;
    fellBack.extract = true;
  }

  // Final safety: defaults must exist on plan
  if (!isModelSelectable(classify, planId, env)) classify = "google/gemini-2.5-flash";
  if (!isModelSelectable(extract, planId, env)) extract = "google/gemini-2.5-flash";

  return { classify, extract, fellBack };
}

export function estimateTokenCostUsd(modelId: string, totalTokens: number): number {
  const def = modelDefinition(modelId);
  if (!def || totalTokens <= 0) return 0;
  return (totalTokens / 1_000_000) * def.estUsdPer1MTokens;
}

export function modelCatalogStats(planId: PlanId): { total: number; available: number } {
  const list = modelsForPlan(planId);
  return {
    total: list.length,
    available: list.filter((m) => m.available !== false).length,
  };
}
