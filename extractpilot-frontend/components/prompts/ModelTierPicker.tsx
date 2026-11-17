"use client";

import { useEffect, useMemo, useState } from "react";
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
  available?: boolean;
  provider?: string;
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
  const [catalogCount, setCatalogCount] = useState(0);
  const [defaults, setDefaults] = useState<{ classify: string; extract: string } | null>(null);
  const [planName, setPlanName] = useState("");
  const [search, setSearch] = useState("");
  const [policyNote, setPolicyNote] = useState<string | null>(null);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);

  useEffect(() => {
    void restClient.promptStudio.models().then((res) => {
      if (!res.success) return;
      const list = res.data.models as ModelOption[];
      setModels(list);
      setCatalogCount((res.data.catalog as unknown[] | undefined)?.length ?? list.length);
      setDefaults(res.data.defaults);
      setPlanName(res.data.planName);
      const policy = res.data.policy as {
        onlyEnterpriseCanPickModels?: boolean;
        modelAllowlist?: string[];
      };
      if (policy?.onlyEnterpriseCanPickModels && res.data.planId !== "enterprise") {
        setPolicyNote("Your plan uses default models only. Enterprise can pick any model.");
      } else if (policy?.modelAllowlist && policy.modelAllowlist.length > 0) {
        setPolicyNote("Model list is curated by your workspace admin.");
      }

      const firstOk = list.find((m) => m.available !== false);
      const pick = (wanted: string | undefined, role: "classify" | "extract") => {
        const hit = wanted ? list.find((m) => m.id === wanted) : undefined;
        if (hit && hit.available !== false) return wanted;
        const fb = res.data.defaults[role] || firstOk?.id;
        if (wanted && fb && wanted !== fb) {
          setFallbackNote(`${wanted.split("/").pop()} unavailable — using ${fb.split("/").pop()} for ${role}.`);
        }
        return fb;
      };
      const nextClassify = pick(classifyModel, "classify");
      const nextExtract = pick(extractModel, "extract");
      if (nextClassify) onClassifyChange(nextClassify);
      if (nextExtract) onExtractChange(nextExtract);
    });
    // intentionally once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.provider ?? "").toLowerCase().includes(q) ||
        m.tier.toLowerCase().includes(q),
    );
  }, [models, search]);

  const availableCount = models.filter((m) => m.available !== false).length;

  function onSelect(role: "classify" | "extract", raw: string) {
    const hit = models.find((m) => m.id === raw);
    if (hit && hit.available === false) {
      const fb = defaults?.[role] || models.find((m) => m.available !== false)?.id;
      setFallbackNote(`${hit.label} is unavailable — select another model or use ${fb?.split("/").pop()}.`);
      if (fb) {
        if (role === "classify") onClassifyChange(fb);
        else onExtractChange(fb);
      }
      return;
    }
    setFallbackNote(null);
    if (role === "classify") onClassifyChange(raw || undefined);
    else onExtractChange(raw || undefined);
  }

  function renderSelect(label: string, value: string | undefined, role: "classify" | "extract") {
    const options = filtered.filter((m) => {
      if (!m.recommendedFor || m.recommendedFor === "both") return true;
      return m.recommendedFor === role;
    });
    const current = models.find((m) => m.id === value);
    const list =
      current && !options.some((o) => o.id === current.id) ? [current, ...options] : options.length ? options : filtered;

    return (
      <label className="block text-sm">
        <span className="font-medium text-ink">{label}</span>
        <select
          className="input-field mt-1"
          value={value ?? ""}
          onChange={(e) => onSelect(role, e.target.value)}
        >
          {list.map((m) => (
            <option key={m.id} value={m.id} disabled={m.available === false}>
              {m.available === false ? "[unavailable] " : ""}
              {m.label}
              {m.provider ? ` · ${m.provider}` : ""} — {m.costHint} ({m.tier})
            </option>
          ))}
        </select>
        {current?.description ? <p className="mt-1.5 text-[12px] text-ink-muted">{current.description}</p> : null}
      </label>
    );
  }

  return (
    <Panel
      title="AI models"
      description={
        defaults
          ? `${planName} · ${availableCount} available on your plan · ${catalogCount} in full catalog`
          : "Loading model catalog…"
      }
    >
      <input
        className="input-field mb-4"
        placeholder="Search 50+ models by name, provider, or tier…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {renderSelect("Classify model", classifyModel, "classify")}
        {renderSelect("Extract model", extractModel, "extract")}
      </div>
      {fallbackNote ? <p className="mt-3 text-xs font-medium text-accent">{fallbackNote}</p> : null}
      {policyNote ? <p className="mt-2 text-xs font-medium text-rust">{policyNote}</p> : null}
      <p className="mt-3 text-xs text-ink-muted">
        Unavailable models are disabled. If one goes offline, ExtractPilot auto-selects a working default on your plan.
      </p>
    </Panel>
  );
}
