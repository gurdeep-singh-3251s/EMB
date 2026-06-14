import type { ApiResult } from "./apiClient";

export function unwrapApiResult<T>(result: ApiResult<T>): T {
  if (!result.success) {
    throw new Error(result.message);
  }
  return result.data;
}
