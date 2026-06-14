import { describe, expect, test } from "bun:test";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit", () => {
  test("allows all requests when redis is null", async () => {
    const result = await checkRateLimit(null, "free", "rest", "/api/v1/emails");
    expect(result.limited).toBe(false);
    expect(result.limit).toBe(30);
  });
});
