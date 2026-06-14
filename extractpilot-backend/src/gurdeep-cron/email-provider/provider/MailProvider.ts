import type { EmailJobPayload } from "@repo/types/email";

export interface MailProvider {
  fetchRecent(): Promise<EmailJobPayload[]>;
}
