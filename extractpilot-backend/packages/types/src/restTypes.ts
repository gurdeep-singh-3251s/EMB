import type { Env } from "@repo/config";
import type { Database } from "@repo/db";
import type { DTO } from "@repo/dto";
import type { EmailDetail, EmailListItem } from "./emailDetail";
import type { ResultsTimeRangeKey } from "./resultsTimeRange";
import type { EmailLookbackKey } from "./emailLookback";
import type {
  CreateUserQueryInput,
  UserQueryEmailResult,
  UserQueryRow,
} from "./userQuery";
import type { DefaultEmailWithCustomFields } from "./parsedEmail";
import type { ProcessingStatus } from "./email";
import type { EmailService } from "./emailServicePort";
import type { MailProviderOverrides } from "./mailProviderOverrides";

type UserQueryResultsPage = {
  items: UserQueryEmailResult[];
  total: number;
  limit: number;
  offset: number;
  timeRange: ResultsTimeRangeKey;
  statusCounts?: {
    pending: number;
    processing: number;
    completed: number;
    partial: number;
    skipped: number;
    failed: number;
  };
};

/** REST layer view of app services (avoids @repo/types → feature package cycles). */
export interface RestAppContext {
  services: {
    email: {
      list(input: {
        limit?: number;
        offset?: number;
        status?: ProcessingStatus;
      }): Promise<DTO<EmailListItem[]>>;
      byId(id: string): Promise<DTO<EmailDetail>>;
      stats(): Promise<DTO<Record<ProcessingStatus, number>>>;
      patchHumanReview(
        id: string,
        input: {
          fields?: Record<string, unknown>;
          attachments?: Array<{ filename: string; data: Record<string, unknown> }>;
        },
      ): Promise<DTO<EmailDetail>>;
    };
    userQuery: {
      create(input: CreateUserQueryInput): Promise<DTO<UserQueryRow>>;
      getActive(): Promise<DTO<UserQueryRow | null>>;
      byId(id: string): Promise<DTO<UserQueryRow | null>>;
      listResults(
        userQueryId: string,
        input?: {
          limit?: number;
          offset?: number;
          includeInProgress?: boolean;
          timeRange?: ResultsTimeRangeKey;
        },
      ): Promise<DTO<UserQueryResultsPage>>;
    };
    attachment: {
      byEmailId(emailId: string): Promise<
        DTO<
          Array<{
            id: string;
            emailId: string;
            filename: string;
            mimeType: string;
            sizeBytes: number;
            localPath: string;
            processingStatus: string;
            extractedText: string | null;
            extractSource: string | null;
            errorMessage: string | null;
            parsedJson: unknown;
          }>
        >
      >;
      byId(id: string): Promise<
        DTO<{
          id: string;
          emailId: string;
          filename: string;
          mimeType: string;
          sizeBytes: number;
          localPath: string;
          processingStatus: string;
          extractedText: string | null;
          extractSource: string | null;
          errorMessage: string | null;
          parsedJson: unknown;
        } | null>
      >;
    };
  };
}

type PollOptions = {
  timeoutMs: number | undefined;
  intervalMs: number | undefined;
  limit: number | undefined;
};

const DEFAULT_POLL_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_POLL_LIMIT = 200;

type RestHandlerDeps = {
  env: Env;
  getContext: () => RestAppContext;
  getDb: () => Database;
  getEmailService: () => EmailService;
  getTenantUserId: () => string | null;
  runnerForTenant: (userId: string) => EmailService;
  getRedis: () => import("ioredis").Redis | null;
};

type RestSuccessEnvelope<T> = {
  success: true;
  message: string | null;
  data: T;
};

type RestErrorEnvelope<E> = {
  success: false;
  message: string;
  error: E | null;
};

type RestExtractedAttachment = {
  filename: string;
  mimeType: string;
  status: string;
};

type RestExtractedSource = {
  rawContent: string | null;
  attachments: RestExtractedAttachment[];
};

type RestExtractedRow = {
  emailId: string;
  subject: string | null;
  sender: string | null;
  processingStatus: string;
  extracted: Record<string, unknown> | null;
  source: RestExtractedSource;
};

type ExtractedDataRow = RestExtractedRow & {
  classification: UserQueryEmailResult["classificationResult"];
};

type UserQueryResultsPayload = {
  count: number;
  completedCount: number;
  processedCount: number;
  extractedData: ExtractedDataRow[];
  results: UserQueryEmailResult[];
};

type RestUserQueryResultsPublic = {
  count: number;
  completedCount: number;
  extractedData: RestExtractedRow[];
};

type RestUserQueryStatusCounts = {
  pending: number;
  processing: number;
  completed: number;
  partial: number;
  skipped: number;
  failed: number;
};

type RestUserQueryResultsData = {
  userQueryId: string;
  timeRange: ResultsTimeRangeKey;
  limit: number;
  offset: number;
  total: number;
  count: number;
  completedCount: number;
  hasMore: boolean;
  statusCounts?: RestUserQueryStatusCounts;
  extractedData: RestExtractedRow[];
};

type RestLookbackOption = {
  key: EmailLookbackKey;
  hours: number;
  label: string;
};

type RestLookbackOptionsData = {
  options: RestLookbackOption[];
  defaultEnvHours: number;
};

type RestMailboxConfigData = {
  configured: boolean;
  provider: string | null;
  providerPreset: string | null;
  host: string;
  port: number;
  user: string | null;
};

type RestMailboxConnectedData = {
  provider: string;
  providerPreset: string | null;
  host: string;
  port: number;
  user: string;
};

type RestExtractEmailsBaseData = {
  imapFetched: number;
  enqueued: number;
};

type RestExtractEmailsWaitData = RestExtractEmailsBaseData & {
  extractedData: RestExtractedRow[];
  completedCount: number;
  processedCount: number;
  count: number;
  timedOut: boolean;
};

type RestExtractEmailsData = RestExtractEmailsBaseData | RestExtractEmailsWaitData;

type RestEmailDetailData = EmailDetail & {
  extracted: DefaultEmailWithCustomFields | Record<string, unknown> | null;
};

type RestStoredEmailAttachment = {
  id: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  processingStatus: string;
  extractedText: string | null;
  extractSource: string | null;
  errorMessage: string | null;
  extractedData: Record<string, unknown> | null;
  downloadable: boolean;
};

type RestDisconnectedMailboxData = null;

type RestEmailListData = EmailListItem[];

type RestUserQueryRowData = UserQueryRow;

export type { MailProviderOverrides } from "./mailProviderOverrides";
export type { EmailService } from "./emailServicePort";
export type { EmailLookbackKey } from "./emailLookback";
export type { ResultsTimeRangeKey } from "./resultsTimeRange";

export {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_POLL_LIMIT,
  DEFAULT_POLL_TIMEOUT_MS,
};

export type {
  ExtractedDataRow,
  UserQueryResultsPayload,
  RestDisconnectedMailboxData,
  RestEmailDetailData,
  RestEmailListData,
  RestStoredEmailAttachment,
  RestErrorEnvelope,
  RestExtractedAttachment,
  RestExtractedRow,
  RestExtractedSource,
  RestExtractEmailsBaseData,
  RestExtractEmailsData,
  RestExtractEmailsWaitData,
  RestUserQueryResultsPublic,
  RestHandlerDeps,
  RestLookbackOption,
  RestLookbackOptionsData,
  RestMailboxConfigData,
  RestMailboxConnectedData,
  RestSuccessEnvelope,
  RestUserQueryResultsData,
  RestUserQueryRowData,
  PollOptions,
};
