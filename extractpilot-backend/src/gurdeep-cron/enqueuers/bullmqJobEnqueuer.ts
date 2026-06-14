import type { createEmailProcessingQueue } from "../email-provider/provider/emailQueueProvider";
import { enqueueEmailJob } from "../email-provider/provider/emailQueueProvider";
import type { JobEnqueuer } from "./IbullmqJobEnqueuer";

export class BullMqJobEnqueuer implements JobEnqueuer {
  constructor(private readonly queue: ReturnType<typeof createEmailProcessingQueue>) {}

  async enqueue(emailUuid: string): Promise<void> {
    await enqueueEmailJob(this.queue, { emailUuid });
  }
}
