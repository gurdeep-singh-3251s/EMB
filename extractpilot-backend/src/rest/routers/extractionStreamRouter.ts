import { createProgressSubscriber } from "@repo/feature-queue";
import type { UserQueryStatusCounts } from "@repo/types/extractionProgress";
import type { RestHandlerDeps } from "@repo/types/restTypes";
import { BaseRestController } from "../helper/init";

const POLL_MS = 500;
const HEARTBEAT_MS = 15_000;

function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function emptyCounts(): UserQueryStatusCounts {
  return {
    pending: 0,
    processing: 0,
    completed: 0,
    partial: 0,
    skipped: 0,
    failed: 0,
  };
}

class ExtractionStreamHandler extends BaseRestController {
  async stream(req: Request, userQueryId: string): Promise<Response> {
    const redis = this.deps.getRedis();
    if (!redis) {
      return this.validationError("Live progress requires Redis.", null);
    }

    const active = await this.ctx.services.userQuery.getActive();
    if (!active.success) {
      return this.fromDto(active);
    }
    if (active.data === null) {
      return this.notFound("No active user query.");
    }
    if (userQueryId === "current") {
      userQueryId = active.data.id;
    }

    const owned = await this.ctx.services.userQuery.byId(userQueryId);
    if (!owned.success) {
      return this.fromDto(owned);
    }
    if (owned.data === null) {
      return this.notFound("User query not found");
    }

    let imapFetched = 0;
    let enqueued = 0;
    let closed = false;
    let completeSent = false;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start: (controller) => {
        const push = (event: string, data: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(sseLine(event, data)));
          } catch {
            closed = true;
          }
        };

        let subscriber: { close: () => void } | undefined;
        let heartbeat: ReturnType<typeof setInterval> | undefined;
        let poll: ReturnType<typeof setInterval> | undefined;

        const cleanup = () => {
          closed = true;
          if (heartbeat) clearInterval(heartbeat);
          if (poll) clearInterval(poll);
          subscriber?.close();
          try {
            controller.close();
          } catch {
            // already closed
          }
        };

        const pushSnapshot = async () => {
          if (closed) return;

          try {
            const result = await this.ctx.services.userQuery.listResults(userQueryId, {
              limit: 1,
              offset: 0,
              includeInProgress: true,
              timeRange: "all",
            });
            if (!result.success || closed) return;

            const statusCounts = result.data.statusCounts ?? emptyCounts();
            push("progress", {
              type: "snapshot",
              userQueryId,
              imapFetched,
              enqueued,
              total: result.data.total,
              statusCounts,
              at: new Date().toISOString(),
            });

            const inFlight = statusCounts.pending + statusCounts.processing;
            if (enqueued > 0 && inFlight === 0 && !completeSent) {
              completeSent = true;
              push("progress", {
                type: "phase",
                phase: "complete",
                userQueryId,
                at: new Date().toISOString(),
              });
              setTimeout(cleanup, 250);
            }
          } catch (err) {
            console.error("[extraction/stream] snapshot failed", err);
          }
        };

        void pushSnapshot();

        try {
          subscriber = createProgressSubscriber(this.deps.env.redisUrl, userQueryId, (event) => {
            if (event.type === "fetch") {
              imapFetched = event.imapFetched;
              enqueued = event.enqueued;
            }
            push("progress", event);
            if (event.type === "email" || event.type === "fetch") {
              void pushSnapshot();
            }
          });
        } catch (err) {
          console.error("[extraction/stream] redis subscribe failed", err);
        }

        heartbeat = setInterval(() => {
          push("heartbeat", { at: new Date().toISOString() });
        }, HEARTBEAT_MS);

        poll = setInterval(() => {
          void pushSnapshot();
        }, POLL_MS);

        req.signal.addEventListener("abort", cleanup);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }
}

async function handleExtractionStreamRouter(
  req: Request,
  deps: RestHandlerDeps,
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path !== "/api/v1/extraction/stream" || req.method !== "GET") {
    return null;
  }

  const userQueryId = url.searchParams.get("userQueryId") ?? "current";
  const handler = new ExtractionStreamHandler(deps);
  return handler.stream(req, userQueryId);
}

export { handleExtractionStreamRouter };
