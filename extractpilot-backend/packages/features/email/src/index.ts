export { createEmailRepo, createEmailService } from "./factory";
export type { IEmailRepo, EmailListItem, EmailDetail } from "./repo/iEmailRepo";
export type { IEmailService } from "./service/iEmailService";
export type { SavePendingEmailInput, SavedPendingEmail } from "@repo/types/email";
export { EmailRepo } from "./repo/emailRepo";
export { EmailService } from "./service/emailService";
