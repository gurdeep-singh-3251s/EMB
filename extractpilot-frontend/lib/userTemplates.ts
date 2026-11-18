import type { FieldSpec } from "@/lib/restClient";

export type ManagedTemplate = {
  id: string;
  name: string;
  description: string;
  userQuery: string;
  outputSchema: Record<string, FieldSpec>;
  updatedAt: string;
  source: "custom";
};

const STORAGE_KEY = "extractpilot-user-templates";

export function loadUserTemplates(): ManagedTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ManagedTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUserTemplates(items: ManagedTemplate[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function upsertUserTemplate(partial: {
  id?: string;
  name: string;
  description: string;
  userQuery: string;
  outputSchema: Record<string, FieldSpec>;
}): ManagedTemplate[] {
  const items = loadUserTemplates();
  const now = new Date().toISOString();
  const id = partial.id ?? `tpl_${crypto.randomUUID()}`;
  const next: ManagedTemplate = {
    id,
    name: partial.name.trim() || "Untitled template",
    description: partial.description.trim(),
    userQuery: partial.userQuery,
    outputSchema: partial.outputSchema,
    updatedAt: now,
    source: "custom",
  };
  const idx = items.findIndex((t) => t.id === id);
  if (idx >= 0) items[idx] = next;
  else items.unshift(next);
  saveUserTemplates(items);
  return items;
}

export function deleteUserTemplate(id: string): ManagedTemplate[] {
  const items = loadUserTemplates().filter((t) => t.id !== id);
  saveUserTemplates(items);
  return items;
}
