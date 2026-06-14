import { QueryClient } from "@tanstack/react-query";

/** Cached data is treated as fresh — no refetch while navigating dashboard routes. */
export const REST_STALE_MS = 15 * 60 * 1000;

/** Keep inactive pages in memory so quick back/forward navigation is instant. */
export const REST_GC_MS = 2 * 60 * 60 * 1000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: REST_STALE_MS,
        gcTime: REST_GC_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  });
}
