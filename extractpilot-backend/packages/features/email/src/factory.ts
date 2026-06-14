import type { Database } from "@repo/db";
import type { ExtractionProgressPublisher } from "@repo/feature-queue";
import type { IEmailRepo } from "./repo/iEmailRepo";
import type { IEmailService } from "./service/iEmailService";
import { EmailRepo } from "./repo/emailRepo";
import { EmailService } from "./service/emailService";

export function createEmailRepo(db: Database): IEmailRepo {
  return new EmailRepo({ db });
}

export function createEmailService(
  db: Database,
  options?: { progressPublisher?: ExtractionProgressPublisher },
): IEmailService {
  return new EmailService({
    repo: createEmailRepo(db),
    progressPublisher: options?.progressPublisher,
  });
}
