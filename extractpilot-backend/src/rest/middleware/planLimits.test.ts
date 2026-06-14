import { describe, expect, test } from "bun:test";
import { resolveActivePlanId } from "./planLimits";

describe("resolveActivePlanId", () => {
  test("defaults to free", () => {
    expect(resolveActivePlanId(undefined)).toBe("free");
    expect(resolveActivePlanId("invalid")).toBe("free");
  });

  test("accepts valid plan ids", () => {
    expect(resolveActivePlanId("standard")).toBe("standard");
    expect(resolveActivePlanId("premium")).toBe("premium");
  });
});

describe("checkExtractionAllowed unlimited", () => {
  test("skips quota when unlimited flag is set", async () => {
    const { checkExtractionAllowed } = await import("./planLimits");
    const result = await checkExtractionAllowed(null as never, "free", { unlimited: true });
    expect(result.ok).toBe(true);
  });
});
