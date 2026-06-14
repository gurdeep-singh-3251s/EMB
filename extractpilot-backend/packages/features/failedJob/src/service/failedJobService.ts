import { DTO } from "@repo/dto";
import type { FailedJobServiceDeps, IFailedJobService } from "./iFailedJobService";
import type { FailedJobRow } from "../repo/iFailedJobRepo";

class FailedJobService implements IFailedJobService {
  constructor(private readonly deps: FailedJobServiceDeps) {}

  async list(limit?: number): Promise<DTO<FailedJobRow[]>> {
    try {
      const jobs = await this.deps.repo.list(limit);
      return DTO.Success(jobs);
    } catch (error) {
      return DTO.UnhandledError("Failed to list failed jobs", error);
    }
  }
}

export default FailedJobService;