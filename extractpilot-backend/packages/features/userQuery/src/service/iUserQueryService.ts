import type { DTO } from "@repo/dto";
import type { UserQueryResultsPage } from "../repo/iUserQueryRepo";
import type { ResultsTimeRangeKey } from "../resultsTimeRange";
import type { CreateUserQueryInput, UserQueryRow } from "@repo/types/userQuery";
import type { IUserQueryRepo } from "../repo/iUserQueryRepo";

export interface IUserQueryService {
  create(input: CreateUserQueryInput): Promise<DTO<UserQueryRow>>;
  getActive(): Promise<DTO<UserQueryRow | null>>;
  listResults(
    userQueryId: string,
    input?: {
      limit?: number;
      offset?: number;
      includeInProgress?: boolean;
      timeRange?: ResultsTimeRangeKey;
    },
  ): Promise<DTO<UserQueryResultsPage>>;
}

export type UserQueryServiceDeps = { repo: IUserQueryRepo };
