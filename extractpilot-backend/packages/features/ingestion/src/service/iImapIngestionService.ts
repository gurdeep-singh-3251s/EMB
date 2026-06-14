import type { EmailJobPayload, EmailProvider } from "@repo/types/email";

export interface ImapAccountConfig {
  provider: EmailProvider;
  host: string;
  port: number;
  user: string;
  password: string;
  secure?: boolean;
}

export interface ImapFetchOptions {
  sinceHours?: number;
  unreadOnly?: boolean;
  markSeenOnSuccess?: boolean;
}

export interface IImapIngestionService {
  fetchRecent(config: ImapAccountConfig, options?: ImapFetchOptions): Promise<EmailJobPayload[]>;
  fetchUnread(config: ImapAccountConfig, options?: ImapFetchOptions): Promise<EmailJobPayload[]>;
}
