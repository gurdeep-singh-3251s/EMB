import type { Redis } from "ioredis";
import {
  extractionProgressChannel,
  type ExtractionProgressEvent,
  type ExtractionProgressPhase,
  type UserQueryStatusCounts,
} from "@repo/types/extractionProgress";
import type { ProcessingStatus } from "@repo/types/email";
import { createRedisConnection } from "./queueConnection";

export class ExtractionProgressPublisher {
  constructor(private readonly redis: Redis) {}

  static fromUrl(redisUrl: string): ExtractionProgressPublisher {
    return new ExtractionProgressPublisher(createRedisConnection(redisUrl));
  }

  private send(userQueryId: string, payload: ExtractionProgressEvent): void {
    void this.redis.publish(extractionProgressChannel(userQueryId), JSON.stringify(payload));
  }

  phase(userQueryId: string | null | undefined, phase: ExtractionProgressPhase): void {
    if (!userQueryId) return;
    this.send(userQueryId, {
      type: "phase",
      phase,
      userQueryId,
      at: new Date().toISOString(),
    });
  }

  fetch(userQueryId: string | null | undefined, imapFetched: number, enqueued: number): void {
    if (!userQueryId) return;
    this.send(userQueryId, {
      type: "fetch",
      imapFetched,
      enqueued,
      userQueryId,
      at: new Date().toISOString(),
    });
  }

  emailStatus(
    userQueryId: string | null | undefined,
    emailId: string,
    status: ProcessingStatus,
  ): void {
    if (!userQueryId) return;
    this.send(userQueryId, {
      type: "email",
      emailId,
      status,
      userQueryId,
      at: new Date().toISOString(),
    });
  }

  snapshot(
    userQueryId: string,
    input: {
      imapFetched: number;
      enqueued: number;
      total: number;
      statusCounts: UserQueryStatusCounts;
    },
  ): void {
    this.send(userQueryId, {
      type: "snapshot",
      ...input,
      userQueryId,
      at: new Date().toISOString(),
    });
  }
}

export function createProgressSubscriber(
  redisUrl: string,
  userQueryId: string,
  onEvent: (event: ExtractionProgressEvent) => void,
): { close: () => void } {
  const sub = createRedisConnection(redisUrl);
  const channel = extractionProgressChannel(userQueryId);

  sub.subscribe(channel, (err) => {
    if (err) console.error("[progress] subscribe failed", err);
  });

  sub.on("message", (_channel, message) => {
    try {
      onEvent(JSON.parse(message) as ExtractionProgressEvent);
    } catch {
      // ignore malformed payloads
    }
  });

  return {
    close: () => {
      void sub.unsubscribe(channel);
      void sub.quit();
    },
  };
}
