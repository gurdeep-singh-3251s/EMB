declare module "bullmq" {
  export type ConnectionOptions = import("ioredis").Redis | Record<string, unknown>;

  export class Queue<DataType = unknown> {
    constructor(name: string, opts?: { connection?: ConnectionOptions });
    add(
      name: string,
      data: DataType,
      opts?: Record<string, unknown>,
    ): Promise<unknown>;
    addBulk(
      jobs: Array<{
        name: string;
        data: DataType;
        opts?: Record<string, unknown>;
      }>,
    ): Promise<unknown[]>;
    getJob(jobId: string): Promise<{
      getState(): Promise<string>;
      remove(): Promise<void>;
    } | undefined>;
    getJobCounts(
      ...types: Array<"waiting" | "active" | "completed" | "failed" | "delayed" | "paused">
    ): Promise<Record<string, number>>;
    close(): Promise<void>;
    getWaitingCount(): Promise<number>;
    getActiveCount(): Promise<number>;
    getCompletedCount(): Promise<number>;
    getFailedCount(): Promise<number>;
    getDelayedCount(): Promise<number>;
  }

  export interface Job<DataType = unknown> {
    id?: string;
    data: DataType;
    attemptsMade: number;
  }

  export class Worker<DataType = unknown> {
    constructor(
      name: string,
      processor: (job: Job<DataType>) => Promise<void>,
      opts?: { connection?: ConnectionOptions; concurrency?: number },
    );
    on(event: "completed", handler: (job: Job<DataType>) => void): void;
    on(event: "failed", handler: (job: Job<DataType> | undefined, err: Error) => void): void;
    close(): Promise<void>;
  }
}
