"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  restClient,
  type ResultsPage,
  type UserQueryRow,
} from "@/lib/restClient";
import { queryKeys, type UserQueryResultsParams } from "@/lib/queryKeys";
import { unwrapApiResult } from "@/lib/restQueryUtils";

async function fetchCurrentUserQuery(): Promise<UserQueryRow | null> {
  return unwrapApiResult(await restClient.userQuery.current());
}

async function fetchUserQueryResults(params: UserQueryResultsParams): Promise<ResultsPage> {
  return unwrapApiResult(await restClient.userQuery.results(params));
}

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: queryKeys.userQuery.current(),
    queryFn: fetchCurrentUserQuery,
  });
}

export function useUserQueryResults(params: UserQueryResultsParams) {
  return useQuery({
    queryKey: queryKeys.userQuery.results(params),
    queryFn: () => fetchUserQueryResults(params),
    placeholderData: keepPreviousData,
  });
}

export function useInvalidateDashboardData() {
  const queryClient = useQueryClient();

  return {
    afterExtraction: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.userQuery.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.emails.all });
    },
    results: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.userQuery.all });
    },
    emails: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.emails.all });
    },
  };
}

export function usePrefetchUserQueryResults(defaultParams?: UserQueryResultsParams) {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.userQuery.current(),
      queryFn: fetchCurrentUserQuery,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.userQuery.results(
        defaultParams ?? { limit: 25, offset: 0, timeRange: "all", includeInProgress: true },
      ),
      queryFn: () =>
        fetchUserQueryResults(
          defaultParams ?? { limit: 25, offset: 0, timeRange: "all", includeInProgress: true },
        ),
    });
  };
}
