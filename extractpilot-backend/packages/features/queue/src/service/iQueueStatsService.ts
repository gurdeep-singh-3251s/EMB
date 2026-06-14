import type { DTO } from "@repo/dto";

interface QueueSummary {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface IQueueStatsService {
  summary(): Promise<DTO<QueueSummary>>;
}

export type { QueueSummary, IQueueStatsService };