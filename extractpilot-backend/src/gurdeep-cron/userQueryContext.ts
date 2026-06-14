import { wrapOutputSchema } from "@repo/feature-user-query";
import type { IngestionContext } from "@repo/types/email";
import type { UserQueryRow } from "@repo/types/userQuery";

export function buildUserQueryContext(active: UserQueryRow | null): IngestionContext {
  if (!active) {
    return { userQueryId: null, userQuerySchema: null };
  }
  return {
    userQueryId: active.id,
    userQuerySchema: wrapOutputSchema(active.outputSchema),
  };
}
