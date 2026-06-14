"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emailApiProvider, type EmailListItemView } from "@/apiProvider/email/emailApiProvider";
import { restClient, type EmailDetail, type StoredEmailAttachment } from "@/lib/restClient";
import { queryKeys } from "@/lib/queryKeys";
import { unwrapApiResult } from "@/lib/restQueryUtils";

export type EmailListPageData = {
  emails: EmailListItemView[];
  stats: Record<string, number> & { total?: number };
};

async function fetchEmailListPage(limit = 50): Promise<EmailListPageData> {
  const [emailsRes, statsRes] = await Promise.all([
    emailApiProvider.list({ limit }),
    emailApiProvider.stats(),
  ]);
  const emails = unwrapApiResult(emailsRes);
  const stats = unwrapApiResult(statsRes);
  return { emails, stats };
}

async function fetchEmailDetail(id: string): Promise<EmailDetail> {
  return unwrapApiResult(await restClient.emails.byId(id));
}

async function fetchEmailAttachments(emailId: string): Promise<StoredEmailAttachment[]> {
  return unwrapApiResult(await restClient.emails.attachments(emailId));
}

export function useEmailDetail(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.emails.detail(id ?? ""),
    queryFn: () => fetchEmailDetail(id!),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

export function useEmailAttachments(emailId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.emails.attachments(emailId ?? ""),
    queryFn: () => fetchEmailAttachments(emailId!),
    enabled: Boolean(emailId) && (options?.enabled ?? true),
  });
}

export function useEmailListPage(limit = 50) {
  return useQuery({
    queryKey: queryKeys.emails.listPage({ limit }),
    queryFn: () => fetchEmailListPage(limit),
    placeholderData: keepPreviousData,
  });
}

export function usePrefetchEmailListPage(limit = 50) {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.emails.listPage({ limit }),
      queryFn: () => fetchEmailListPage(limit),
    });
  };
}

export function usePrefetchEmailDetail() {
  const queryClient = useQueryClient();

  return (id: string) => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.emails.detail(id),
      queryFn: () => fetchEmailDetail(id),
    });
  };
}

export function usePrefetchEmailAttachments(emailId: string | undefined, enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!emailId || !enabled) return;
    void queryClient.prefetchQuery({
      queryKey: queryKeys.emails.attachments(emailId),
      queryFn: () => fetchEmailAttachments(emailId),
    });
  }, [emailId, enabled, queryClient]);
}

export function usePatchEmailExtracted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      emailId,
      body,
    }: {
      emailId: string;
      body: {
        fields?: Record<string, unknown>;
        attachments?: Array<{ filename: string; data: Record<string, unknown> }>;
      };
    }) => unwrapApiResult(await restClient.emails.patchExtracted(emailId, body)),
    onSuccess: (detail, { emailId }) => {
      queryClient.setQueryData(queryKeys.emails.detail(emailId), detail);
      void queryClient.invalidateQueries({ queryKey: queryKeys.emails.attachments(emailId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userQuery.all });
    },
  });
}
