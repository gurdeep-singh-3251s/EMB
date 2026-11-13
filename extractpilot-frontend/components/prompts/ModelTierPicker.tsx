"use client";

import { useEffect, useState } from "react";
import { restClient } from "@/lib/restClient";
import { Panel } from "@/components/ui/Panel";

type ModelOption = {
  id: string;
  label: string;
  description: string;
  minPlan: string;
  tier: string;
  costHint: string;
  recommendedFor?: string;
};

export function ModelTierPicker({
  classifyModel,
  extractModel,
  onClassifyChange,
  onExtractChange,
}: {
  classifyModel?: string;
  extractModel?: string;
  onClassifyChange: (id: string | undefined) => void;
  onExtractChange: (id: string | undefined) => void;
}) {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [defaults, setDefaults] = useState<{ classify: string; extract: string } | null>(null);
  const [planName, setPlanName] = useState<string>("");
  const [policyNote, setPolicyNote] = useState<string | null>(null);

  useEffect(() => {
    void restClient.promptStudio.models().then((res) => {
      if (!res.success) return;
      setModels(res.data.models as ModelOption[]);
      setDefaults(res.data.defaults);
      setPlanName(res.data.planName);
      const policy = res.data.policy as {
        onlyEnterpriseCanPickModels?: boolean;
        modelAllowlist?: string[];
      };
      if (policy?.onlyEnterpriseCanPickModels && res.data.planId !== "enterprise") {
        setPolicyNote("Your plan uses default models only. Enterprise can pick custom models.");
      } else if (policy?.modelAllowlist && policy.modelAllowlist.length > 0) {
        setPolicyNote("Model list is curated by your workspace admin.");
      }
    });
  }, []);

  function renderSelect(
    label: string,
    value: string | undefined,
    onChange: (v: string | undefined) => void,
    filter: (m: ModelOption) => boolean,
  ) {
    const effective = value ?? "";
    return (
      <label className="block text-sm">
        <span className="font-medium text-ink">{label}</span>
        <select
          className="input-field mt-1"
          value={effective}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          {models.filter(filter).map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — {m.costHint} ({m.tier})
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <Panel
      title="Models"
      description={
        defaults
          ? `${planName} plan — defaults: classify ${defaults.classify.split("/").pop()}, extract ${defaults.extract.split("/").pop()}`
          : "Loading model catalog…"
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {renderSelect(
          "Classify model",
          classifyModel,
          onClassifyChange,
          (m) => m.recommendedFor === "classify" || m.recommendedFor === "both",
        )}
        {renderSelect(
          "Extract model",
          extractModel,
          onExtractChange,
          (m) => m.recommendedFor === "extract" || m.recommendedFor === "both",
        )}
      </div>
      {policyNote ? <p className="mt-3 text-xs font-medium text-rust">{policyNote}</p> : null}
      <p className="mt-2 text-xs text-ink-muted">
        Upgrade your plan to unlock frontier models. Token usage appears under Settings → LLM usage.
      </p>
    </Panel>
  );
}
