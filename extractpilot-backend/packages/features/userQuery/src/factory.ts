import type { Database } from "@repo/db";
import type { IUserQueryRepo } from "./repo/iUserQueryRepo";
import { UserQueryRepo } from "./repo/userQueryRepo";
import type { IUserQueryService } from "./service/iUserQueryService";
import { UserQueryService } from "./service/userQueryService";

export function createUserQueryRepo(db: Database, options?: { ownerUserId?: string | null }): IUserQueryRepo {
  return new UserQueryRepo({ db, ownerUserId: options?.ownerUserId ?? null });
}

export function createUserQueryService(db: Database, options?: { ownerUserId?: string | null }): IUserQueryService {
  return new UserQueryService({ repo: createUserQueryRepo(db, options) });
}
