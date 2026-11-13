import { describe, expect, test } from "bun:test";
import type { Env } from "@repo/config";
import { isRequestAuthorized } from "./apiKey";
import { signAccessToken } from "./jwt";

function oauthEnv(overrides?: Partial<Env>): Env {
  return {
    restApiKey: "integrator-secret-key-32chars!!",
    integratorApiKeyEnabled: false,
    clientOrigin: "http://localhost:3000",
    auth: {
      jwtSecret: "jwt-test-secret-must-be-long-enough-12345",
      googleClientId: "google-client",
      googleClientSecret: "google-secret",
      apiPublicUrl: "http://localhost:3002",
    },
    ...overrides,
  } as Env;
}

describe("isRequestAuthorized (OAuth mode)", () => {
  test("rejects REST API key in Authorization Bearer", async () => {
    const env = oauthEnv();
    const req = new Request("http://localhost/api/v1/emails", {
      headers: { Authorization: "Bearer integrator-secret-key-32chars!!" },
    });
    expect(await isRequestAuthorized(req, env)).toBe(false);
  });

  test("accepts valid JWT Bearer", async () => {
    const env = oauthEnv();
    const jwt = await signAccessToken(
      { id: "00000000-0000-4000-8000-000000000099", email: "a@test.com", name: null, picture: null },
      env,
    );
    const req = new Request("http://localhost/api/v1/emails", {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(await isRequestAuthorized(req, env)).toBe(true);
  });

  test("accepts X-API-Key only when integrator flag enabled", async () => {
    const env = oauthEnv({ integratorApiKeyEnabled: true });
    const req = new Request("http://localhost/api/v1/emails", {
      headers: { "X-API-Key": "integrator-secret-key-32chars!!" },
    });
    expect(await isRequestAuthorized(req, env)).toBe(true);
  });
});
