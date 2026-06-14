import type { Database } from "@repo/db";
import type { IUserQueryRepo } from "./repo/iUserQueryRepo";
import { UserQueryRepo } from "./repo/userQueryRepo";
import type { IUserQueryService } from "./service/iUserQueryService";
import { UserQueryService } from "./service/userQueryService";

export function createUserQueryRepo(db: Database): IUserQueryRepo {
  return new UserQueryRepo({ db });
}

export function createUserQueryService(db: Database): IUserQueryService {
  return new UserQueryService({ repo: createUserQueryRepo(db) });
}
