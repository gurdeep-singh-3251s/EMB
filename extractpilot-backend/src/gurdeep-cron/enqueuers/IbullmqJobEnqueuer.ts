export interface JobEnqueuer {
    enqueue(emailUuid: string): Promise<void>;
}
  