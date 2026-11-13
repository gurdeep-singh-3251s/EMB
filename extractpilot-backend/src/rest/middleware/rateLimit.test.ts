import { describe, expect, test } from "bun:test";
import type { Env } from "@repo/config";
import { checkRateLimit } from "./rateLimit";

const env = {
  rateLimitGlobalIpPerMinute: 300,
  rateLimitPublicPerMinute: 120,
  rateLimitExtractPerMinute: 6,
} as Env;

describe("checkRateLimit", () => {
  test("allows all requests when redis is null", async () => {
    const result = await checkRateLimit({
      redis: null,
      env,
      planId: "free",
      tenantUserId: "00000000-0000-4000-8000-000000000001",
      clientIp: "127.0.0.1",
      path: "/api/v1/emails",
    });
    expect(result.limited).toBe(false);
    expect(result.limit).toBe(30);
  });
});
