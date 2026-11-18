import { describe, expect, test } from "bun:test";
import type { Env } from "@repo/config";
import { validateRestApiKey } from "./apiKeyAuth";

function envWithKey(key: string | undefined, clientOrigin = "http://localhost:3000"): Env {
  return {
    restApiKey: key ?? "",
    clientOrigin,
    auth: { jwtSecret: "", googleClientId: "", googleClientSecret: "", apiPublicUrl: "http://localhost:3002" },
  } as Env;
}

describe("validateRestApiKey", () => {
  test("allows requests when no key configured", async () => {
    const req = new Request("http://localhost/api/v1/user-query");
    expect(await validateRestApiKey(req, envWithKey(undefined))).toBeNull();
  });

  test("rejects missing key from non-browser clients", async () => {
    const req = new Request("http://localhost/api/v1/user-query");
    const res = await validateRestApiKey(req, envWithKey("secret-key-123"));
    expect(res?.status).toBe(401);
    const body = (await res!.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  test("allows same-origin browser without key when OAuth is off", async () => {
    const req = new Request("http://localhost/api/v1/user-query", {
      headers: { Referer: "http://localhost:3000/dashboard" },
    });
    expect(await validateRestApiKey(req, envWithKey("secret-key-123"))).toBeNull();
  });

  test("accepts Bearer API key when OAuth is off", async () => {
    const req = new Request("http://localhost/api/v1/user-query", {
      headers: { Authorization: "Bearer secret-key-123" },
    });
    expect(await validateRestApiKey(req, envWithKey("secret-key-123"))).toBeNull();
  });

  test("accepts X-API-Key header", async () => {
    const req = new Request("http://localhost/api/v1/user-query", {
      headers: { "X-API-Key": "secret-key-123" },
    });
    expect(await validateRestApiKey(req, envWithKey("secret-key-123"))).toBeNull();
  });

  test("allows public plans endpoint without key", async () => {
    const req = new Request("http://localhost/api/v1/plans");
    expect(await validateRestApiKey(req, envWithKey("secret-key-123"))).toBeNull();
  });

  test("allows stripe webhook without key", async () => {
    const req = new Request("http://localhost/api/v1/billing/webhook", { method: "POST" });
    expect(await validateRestApiKey(req, envWithKey("secret-key-123"))).toBeNull();
  });

  test("allows google oauth start without key", async () => {
    const req = new Request("http://localhost/api/v1/auth/google");
    expect(await validateRestApiKey(req, envWithKey("secret-key-123"))).toBeNull();
  });

  test("allows email signup and login without key", async () => {
    const signup = new Request("http://localhost/api/v1/auth/signup", { method: "POST" });
    const login = new Request("http://localhost/api/v1/auth/login", { method: "POST" });
    expect(await validateRestApiKey(signup, envWithKey("secret-key-123"))).toBeNull();
    expect(await validateRestApiKey(login, envWithKey("secret-key-123"))).toBeNull();
  });
});
