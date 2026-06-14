import { DTO } from "@repo/dto";
import type { IQueueStatsService, QueueSummary } from "../interfaces/iQueueStatsService";
import { createRedisConnection } from "../queueConnection";
import { QueueStatsService } from "./queueStatsService";

/** Defers Redis connection until first stats request. */
export class LazyQueueStatsService implements IQueueStatsService {
  private inner: QueueStatsService | null = null;
  private readonly redisUrl: string;

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
  }

  private getInner() {
    if (!this.inner) {
      this.inner = new QueueStatsService(createRedisConnection(this.redisUrl));
    }
    return this.inner;
  }

  async summary(): Promise<DTO<QueueSummary>> {
    try {
      return await this.getInner().summary();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Redis unavailable";
      return DTO.HandledError(message);
    }
  }
}
