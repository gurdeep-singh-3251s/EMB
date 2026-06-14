import type { DTO } from "@repo/dto";
import type { FailedJobRow, IFailedJobRepo } from "../repo/iFailedJobRepo";

export interface IFailedJobService {
  list(limit?: number): Promise<DTO<FailedJobRow[]>>;
}

export type FailedJobServiceDeps = { repo: IFailedJobRepo };
