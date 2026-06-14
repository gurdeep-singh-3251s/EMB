import type { EmailProvider } from "./email";

export type MailProviderOverrides = {
  provider?: EmailProvider;
  imap?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
  };
  /** @deprecated Use `imap` */
  imapGmail?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
  };
  sinceHours?: number;
  unreadOnly?: boolean;
  markSeenOnSuccess?: boolean;
};
