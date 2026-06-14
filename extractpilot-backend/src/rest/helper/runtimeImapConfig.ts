import type { EmailProvider } from "@repo/types/email";
import type { ImapProviderPresetId } from "@repo/types/imapProviders";

type RuntimeImapCredentials = {
  provider: EmailProvider;
  providerPreset?: ImapProviderPresetId | null;
  host: string;
  port: number;
  user: string;
  password: string;
};

type RuntimeImapState = { credentials: RuntimeImapCredentials | null };

const GLOBAL_KEY = "__runtimeImapState__";

function getState(): RuntimeImapState {
  const g = globalThis as unknown as Record<string, unknown>;
  const existing = g[GLOBAL_KEY] as RuntimeImapState | undefined;
  if (existing) return existing;
  const created: RuntimeImapState = { credentials: null };
  g[GLOBAL_KEY] = created;
  return created;
}

function normalizeCredentials(credentials: RuntimeImapCredentials): RuntimeImapCredentials {
  return {
    provider: credentials.provider,
    providerPreset: credentials.providerPreset,
    host: credentials.host,
    port: credentials.port,
    user: credentials.user,
    password: credentials.password.replace(/\s/g, ""),
  };
}

function setRuntimeImapCredentials(credentials: RuntimeImapCredentials): void {
  getState().credentials = normalizeCredentials(credentials);
}

function clearRuntimeImapCredentials(): void {
  getState().credentials = null;
}

function getRuntimeImapCredentials(): RuntimeImapCredentials | null {
  return getState().credentials;
}

export type { RuntimeImapCredentials };
export { clearRuntimeImapCredentials, getRuntimeImapCredentials, setRuntimeImapCredentials };
