import { DTO } from "@repo/dto";
import type { CreateUserQueryInput, UserQueryRow } from "@repo/types/userQuery";
import type { UserQueryResultsPage } from "../repo/iUserQueryRepo";
import type { ResultsTimeRangeKey } from "../resultsTimeRange";
import { resolveResultsSince } from "../resultsTimeRange";
import { createUserQuerySchema } from "../schema/outputSchema";
import type { IUserQueryService, UserQueryServiceDeps } from "./iUserQueryService";

export class UserQueryService implements IUserQueryService {
  constructor(private readonly deps: UserQueryServiceDeps) {}

  async create(input: CreateUserQueryInput): Promise<DTO<UserQueryRow>> {
    const parsed = createUserQuerySchema.safeParse(input);
    if (!parsed.success) {
      return DTO.HandledError(parsed.error.message, parsed.error);
    }
    return DTO.Success(await this.deps.repo.createActive(parsed.data));
  }

  async getActive(): Promise<DTO<UserQueryRow | null>> {
    return DTO.Success(await this.deps.repo.getActive());
  }

  async listResults(
    userQueryId: string,
    input?: {
      limit?: number;
      offset?: number;
      includeInProgress?: boolean;
      timeRange?: ResultsTimeRangeKey;
    },
  ): Promise<DTO<UserQueryResultsPage>> {
    const limit = input?.limit ?? 50;
    const offset = input?.offset ?? 0;
    const timeRange = input?.timeRange ?? "all";
    const completedOnly = !input?.includeInProgress;
    const since = resolveResultsSince(timeRange);

    const list = await this.deps.repo.listResults(userQueryId, limit, offset, {
      completedOnly,
      since,
    });

    return DTO.Success({
      ...list,
      limit,
      offset,
      timeRange,
    });
  }
}
