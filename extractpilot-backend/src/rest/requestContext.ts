import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  tenantUserId: string | null;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestTenantUserId(): string | null {
  return requestContext.getStore()?.tenantUserId ?? null;
}
