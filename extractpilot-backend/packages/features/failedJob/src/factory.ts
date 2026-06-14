import type { Database } from "@repo/db";
import type { IFailedJobRepo } from "./repo/iFailedJobRepo";
import { FailedJobRepo } from "./repo/failedJobRepo";
import type { IFailedJobService } from "./service/iFailedJobService";
import FailedJobService from "./service/failedJobService";

export function createFailedJobRepo(db: Database): IFailedJobRepo {
  return new FailedJobRepo({ db });
}

export function createFailedJobService(db: Database): IFailedJobService {
  return new FailedJobService({ repo: createFailedJobRepo(db) });
}
