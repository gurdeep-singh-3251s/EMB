import type { Database } from "@repo/db";
import type { ExtractionProgressPublisher } from "@repo/feature-queue";
import type { IEmailRepo } from "./repo/iEmailRepo";
import type { IEmailService } from "./service/iEmailService";
import { EmailRepo } from "./repo/emailRepo";
import { EmailService } from "./service/emailService";

export function createEmailRepo(db: Database, options?: { ownerUserId?: string | null }): IEmailRepo {
  return new EmailRepo({ db, ownerUserId: options?.ownerUserId ?? null });
}

export function createEmailService(
  db: Database,
  options?: { progressPublisher?: ExtractionProgressPublisher; ownerUserId?: string | null },
): IEmailService {
  return new EmailService({
    repo: createEmailRepo(db, { ownerUserId: options?.ownerUserId }),
    progressPublisher: options?.progressPublisher,
  });
}
