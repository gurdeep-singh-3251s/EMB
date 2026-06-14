import type { DTO } from "@repo/dto";

export interface QueueSummary {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface IQueueStatsService {
  summary(): Promise<DTO<QueueSummary>>;
}
