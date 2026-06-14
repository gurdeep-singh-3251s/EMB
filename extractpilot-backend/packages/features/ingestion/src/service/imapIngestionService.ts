import { ImapFlow, type FetchMessageObject } from "imapflow";
import { simpleParser, type Attachment, type ParsedMail } from "mailparser";
import type { EmailJobPayload } from "@repo/types/email";
import type { IAttachmentStorageService } from "./iAttachmentStorageService";
import type { IImapIngestionService, ImapAccountConfig, ImapFetchOptions } from "./iImapIngestionService";

export type { ImapAccountConfig, ImapFetchOptions } from "./iImapIngestionService";

/** UID batches — limits memory and Gmail socket timeouts per fetch. */
const FETCH_BATCH_SIZE = 5;
const MS_PER_HOUR = 60 * 60 * 1000;
const MARK_SEEN_TIMEOUT_MS = 30_000;

function logger(message: string, meta?: Record<string, unknown>): void {
  const line = meta ? `${message} ${JSON.stringify(meta)}` : message;
  console.log("[imap]", line);
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function createImapClient(config: ImapAccountConfig, pass: string): ImapFlow {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure ?? true,
    auth: { user: config.user, pass },
    logger: false,
    // Reliability: Gmail IMAP can be slow/idle; bump timeouts to avoid mid-fetch drops.
    greetingTimeout: 60 * 1000,
    socketTimeout: 5 * 60 * 1000,
  });
}

async function disposeImapClient(client: ImapFlow): Promise<void> {
  try {
    await withTimeout(client.logout(), 5_000, "imap dispose logout");
  } catch {
    try {
      await client.close();
    } catch {
      // Best-effort cleanup after a failed or partial session.
    }
  }
}

export class ImapIngestionService implements IImapIngestionService {
  constructor(private readonly attachmentStorage: IAttachmentStorageService) {}

  protected chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  /**
   * Fetch emails received since `sinceHours` ago (default 1 hour).
   * Uses IMAP SINCE for server-side filter, then filters again on parsed Date for accuracy.
   */
  async fetchRecent(config: ImapAccountConfig, options?: ImapFetchOptions): Promise<EmailJobPayload[]> {
    const sinceHours = options?.sinceHours ?? 1;
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
    const unreadOnly = options?.unreadOnly ?? false;
    const markSeenOnSuccess = options?.markSeenOnSuccess ?? false;

    const debug = process.env.IMAP_DEBUG === "true";
    const pass = config.password.replace(/\s/g, "");

    const payloads: EmailJobPayload[] = [];

    // Retry once on transient IMAP network errors. ImapFlow allows connect() only once per instance.
    let client: ImapFlow | null = null;
    let lastConnectErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const attemptClient = createImapClient(config, pass);
      try {
        await attemptClient.connect();
        client = attemptClient;
        break;
      } catch (e) {
        lastConnectErr = e;
        await disposeImapClient(attemptClient);
        if (debug) console.error(`[imap] connect attempt ${attempt + 1} failed`, e);
      }
    }
    if (!client) throw lastConnectErr instanceof Error ? lastConnectErr : new Error("IMAP connect failed");
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const searchQuery = unreadOnly ? { since, seen: false } : { since };
        const searchResult = await client.search(searchQuery, { uid: true });
        const uids = Array.isArray(searchResult) ? searchResult : [];
        if (debug) {
          console.log(
            `[imap] uid candidates since ${since.toISOString()}${unreadOnly ? " (unread only)" : ""}: ${uids.length}`,
          );
        }

        const batches = this.chunk(uids, FETCH_BATCH_SIZE);
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex]!;
          if (batch.length === 0) continue;
          logger("batch start", { batch: batchIndex + 1, total: batches.length, uids: batch });
          try {
            for await (const msg of client.fetch(
              batch,
              { source: true, uid: true, internalDate: true },
              { uid: true },
            )) {
              if (!msg.source) {
                logger("skip empty source", { uid: msg.uid });
                continue;
              }

              logger("download + parse", { uid: msg.uid, bytes: msg.source.length });
              const parsed = await simpleParser(msg.source);
              const receivedAtRaw = msg.internalDate ?? parsed.date ?? new Date();
              const receivedAt = receivedAtRaw instanceof Date ? receivedAtRaw : new Date(receivedAtRaw);

              // IMAP SINCE is sometimes day-granular — enforce exact window here
              if (receivedAt < since) {
                if (debug) console.log(`[imap] skip uid=${msg.uid} — before window (${receivedAt.toISOString()})`);
                continue;
              }

              const messageId = String(parsed.messageId ?? `${config.user}-${msg.uid}`);
              const attachmentFiles = (parsed.attachments ?? []).map((a: Attachment) => ({
                filename: a.filename ?? "attachment",
                mimeType: a.contentType,
                content: a.content,
              }));

              logger("save attachments to disk", {
                uid: msg.uid,
                count: attachmentFiles.length,
                totalBytes: attachmentFiles.reduce((n, f) => n + f.content.length, 0),
              });
              const attachments = await this.attachmentStorage.saveAll(config.provider, messageId, attachmentFiles);

              logger("keep email", {
                uid: msg.uid,
                subject: (parsed.subject ?? "").slice(0, 60),
                attachments: attachments.length,
              });

              payloads.push({
                provider: config.provider,
                messageId,
                sender: parsed.from?.text ?? "",
                subject: parsed.subject ?? "",
                rawContent: String(parsed.text || parsed.html || ""),
                receivedAt: receivedAt.toISOString(),
                attachments,
                userQuerySchema: null,
                metadata: null,
              });

              // Best-effort only: never block ingest on Gmail flag updates (often slow/time out).
              // Safety: DB unique (provider, message_id) + queue jobId dedupe if mark-seen fails.
              if (markSeenOnSuccess) {
                logger("mark seen (async)", { uid: msg.uid });
                void withTimeout(
                  client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true }),
                  MARK_SEEN_TIMEOUT_MS,
                  "mark seen",
                ).catch((e) => {
                  const message = e instanceof Error ? e.message : "mark seen failed";
                  logger("mark seen failed (continuing)", { uid: msg.uid, message });
                });
              }
            }
            logger("batch done", { batch: batchIndex + 1, collected: payloads.length });
          } catch (e) {
            // If Gmail drops the socket mid-run, keep whatever we already collected and exit gracefully.
            logger("batch failed (partial results)", {
              batch: batchIndex + 1,
              error: e instanceof Error ? e.message : String(e),
            });
            break;
          }
        }
        logger("fetch complete", { emails: payloads.length });
      } finally {
        logger("release mailbox lock");
        lock.release();
      }
    } finally {
      logger("logout");
      await disposeImapClient(client);
    }

    return payloads;
  }

  /** @deprecated Use fetchRecent — kept for compatibility */
  async fetchUnread(config: ImapAccountConfig, options?: ImapFetchOptions): Promise<EmailJobPayload[]> {
    return this.fetchRecent(config, { ...options, unreadOnly: true });
  }
}
