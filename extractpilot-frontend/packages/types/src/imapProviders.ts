import { EmailProvider } from "./email";

export type ImapProviderPresetId = "gmail" | "outlook" | "zoho" | "yahoo" | "icloud" | "custom";

export type ImapProviderPreset = {
  id: ImapProviderPresetId;
  label: string;
  provider: EmailProvider;
  host: string;
  port: number;
  secure: boolean;
  help: string;
};

export const IMAP_PROVIDER_PRESETS: ImapProviderPreset[] = [
  {
    id: "gmail",
    label: "Gmail / Google Workspace",
    provider: EmailProvider.Gmail,
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    help: "Enable IMAP in Gmail settings and use a Google App Password (not your login password).",
  },
  {
    id: "outlook",
    label: "Microsoft Outlook / Office 365",
    provider: EmailProvider.Outlook,
    host: "outlook.office365.com",
    port: 993,
    secure: true,
    help: "Use your Microsoft account email and an app password if MFA is enabled.",
  },
  {
    id: "zoho",
    label: "Zoho Mail",
    provider: EmailProvider.Zoho,
    host: "imap.zoho.com",
    port: 993,
    secure: true,
    help: "Generate an application-specific password in Zoho Mail security settings.",
  },
  {
    id: "yahoo",
    label: "Yahoo Mail",
    provider: EmailProvider.Imap,
    host: "imap.mail.yahoo.com",
    port: 993,
    secure: true,
    help: "Use a Yahoo app password with IMAP enabled in account settings.",
  },
  {
    id: "icloud",
    label: "iCloud Mail",
    provider: EmailProvider.Imap,
    host: "imap.mail.me.com",
    port: 993,
    secure: true,
    help: "Use an Apple app-specific password with iCloud IMAP enabled.",
  },
  {
    id: "custom",
    label: "Other IMAP server",
    provider: EmailProvider.Imap,
    host: "",
    port: 993,
    secure: true,
    help: "Enter your provider's IMAP host and port (usually 993 with SSL).",
  },
];

export function inferImapProvider(host: string): EmailProvider {
  const h = host.trim().toLowerCase();
  if (h.includes("gmail") || h.includes("google")) return EmailProvider.Gmail;
  if (
    h.includes("outlook") ||
    h.includes("office365") ||
    h.includes("hotmail") ||
    h.includes("live.com") ||
    h.includes("microsoft")
  ) {
    return EmailProvider.Outlook;
  }
  if (h.includes("zoho")) return EmailProvider.Zoho;
  return EmailProvider.Imap;
}

export function presetById(id: ImapProviderPresetId): ImapProviderPreset {
  return IMAP_PROVIDER_PRESETS.find((p) => p.id === id) ?? IMAP_PROVIDER_PRESETS[IMAP_PROVIDER_PRESETS.length - 1]!;
}
