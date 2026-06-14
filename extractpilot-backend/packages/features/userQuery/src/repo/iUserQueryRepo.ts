import type { Database } from "@repo/db";
import type { ResultsTimeRangeKey } from "../resultsTimeRange";
import type {
  CreateUserQueryInput,
  UserQueryEmailResult,
  UserQueryRow,
} from "@repo/types/userQuery";

export type ListUserQueryResultsOptions = {
  completedOnly: boolean;
  since: string | null;
};

export type UserQueryStatusCounts = {
  pending: number;
  processing: number;
  completed: number;
  partial: number;
  skipped: number;
  failed: number;
};

export type UserQueryResultsList = {
  items: UserQueryEmailResult[];
  total: number;
  statusCounts?: UserQueryStatusCounts;
};

export type UserQueryResultsPage = UserQueryResultsList & {
  limit: number;
  offset: number;
  timeRange: ResultsTimeRangeKey;
};

export interface IUserQueryRepo {
  createActive(input: CreateUserQueryInput): Promise<UserQueryRow>;
  deactivateAllActive(): Promise<void>;
  getActive(): Promise<UserQueryRow | null>;
  byId(id: string): Promise<UserQueryRow | null>;
  listResults(
    userQueryId: string,
    limit: number,
    offset: number,
    options: ListUserQueryResultsOptions,
  ): Promise<UserQueryResultsList>;
}

export type UserQueryRepoDeps = { db: Database };
