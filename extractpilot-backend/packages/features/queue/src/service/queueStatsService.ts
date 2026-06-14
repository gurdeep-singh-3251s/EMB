import { Queue, type ConnectionOptions } from "bullmq";
import type { Redis } from "ioredis";
import { DTO } from "@repo/dto";
import { EMAIL_PROCESSING_QUEUE } from "../constants";
import type { IQueueStatsService, QueueSummary } from "../interfaces/iQueueStatsService";

export class QueueStatsService implements IQueueStatsService {
  private readonly queue: Queue;

  constructor(connection: Redis) {
    this.queue = new Queue(EMAIL_PROCESSING_QUEUE, {
      connection: connection as ConnectionOptions,
    });
  }

  async summary(): Promise<DTO<QueueSummary>> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);
    return DTO.Success({ waiting, active, completed, failed, delayed });
  }
}
