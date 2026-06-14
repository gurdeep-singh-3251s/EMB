import type { DTO } from "@repo/dto";
import type { EmailRunnerResult } from "./email";
import type { MailProviderOverrides } from "./mailProviderOverrides";

export interface EmailService {
  runner(overrides?: MailProviderOverrides): Promise<DTO<EmailRunnerResult>>;
}
