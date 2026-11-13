import { describe, expect, it } from "bun:test";
import type { Redis } from "ioredis";
import { acquireDebounce } from "./requestDebounce";

function mockRedis(): Redis {
  const keys = new Map<string, string>();
  return {
    set: async (key: string, _value: string, _ex: "EX", ttl: number, nx?: "NX") => {
      if (nx === "NX" && keys.has(key)) return null;
      keys.set(key, "1");
      void ttl;
      return "OK";
    },
    ttl: async (key: string) => (keys.has(key) ? 2 : -2),
  } as unknown as Redis;
}

describe("acquireDebounce", () => {
  it("blocks duplicate keys until TTL expires", async () => {
    const redis = mockRedis();
    const first = await acquireDebounce(redis, "ep:debounce:test", 2);
    const second = await acquireDebounce(redis, "ep:debounce:test", 2);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.retryAfterSeconds).toBeGreaterThan(0);
    }
  });
});
