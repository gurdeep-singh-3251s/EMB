import { serve, type Server } from "bun";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { Redis } from "ioredis";
import { appRouter } from "./bootstrap/appRouter";
import type { AppContext } from "./appContext";
import type { Env } from "@repo/config";
import { isRequestAuthorized } from "./auth/apiKey";
import { handleApiV1Request, securityHeaders } from "./rest/router";
import { openApiSpec } from "./rest/swagger/openapiSpec";
import { swaggerUiHtml } from "./rest/swagger/swaggerUi";
import type { RestHandlerDeps } from "@repo/types/restTypes";
import type { TrpcContext } from "./trpc/context";

type FetchHandler = (req: Request) => Response | Promise<Response>;

export type ApiServerOptions = {
  rest?: Omit<RestHandlerDeps, "env" | "getContext" | "getDb" | "getRedis">;
  redis?: Redis;
};

export class ApiServer {
  private readonly trpcHandler: FetchHandler;
  private readonly restDeps: RestHandlerDeps | null;
  private readonly redis: Redis | null;

  constructor(
    private readonly env: Env,
    getContext: () => AppContext,
    options?: ApiServerOptions,
  ) {
    this.redis = options?.redis ?? null;
    this.trpcHandler = this.createTrpcHandler(getContext);
    this.restDeps =
      options?.rest != null
        ? {
            env: this.env,
            getContext: () => getContext(),
            getDb: () => getContext().db,
            getEmailService: options.rest.getEmailService,
            getRedis: () => this.redis,
          }
        : null;
  }

  private createTrpcHandler(getContext: () => AppContext): FetchHandler {
    return (req: Request) =>
      fetchRequestHandler({
        endpoint: "/api/trpc",
        req,
        router: appRouter,
        createContext: async (): Promise<TrpcContext> => ({
          ...getContext(),
          env: this.env,
          isAuthenticated: await isRequestAuthorized(req, this.env),
          redis: this.redis,
        }),
      });
  }

  private corsHeaders(): Record<string, string> {
    return {
      "Access-Control-Allow-Origin": this.env.clientOrigin,
      "Access-Control-Allow-Credentials": "true",
    };
  }

  private withCors(res: Response): Response {
    for (const [key, value] of Object.entries(this.corsHeaders())) {
      res.headers.set(key, value);
    }
    for (const [key, value] of Object.entries(securityHeaders())) {
      res.headers.set(key, value);
    }
    return res;
  }

  private handleOptions(): Response {
    return new Response(null, {
      status: 204,
      headers: {
        ...this.corsHeaders(),
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
      },
    });
  }

  private handleHealth(): Response {
    return Response.json({ ok: true });
  }

  private async handleTrpc(req: Request): Promise<Response> {
    const res = await this.trpcHandler(req);
    return this.withCors(res);
  }

  private async handleRest(req: Request): Promise<Response | null> {
    if (!this.restDeps) return null;
    return handleApiV1Request(req, this.restDeps);
  }

  async fetch(req: Request): Promise<Response> {
    try {
      return await this.handleFetch(req);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error("[server] Unhandled error", err);
      return Response.json({ success: false, message, error: null }, { status: 500 });
    }
  }

  private async handleFetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return this.handleOptions();
    }

    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return this.handleHealth();
    }

    if (url.pathname === "/api/openapi.json") {
      return Response.json(openApiSpec);
    }

    if (url.pathname === "/api/docs" || url.pathname === "/api/docs/") {
      const specUrl = `${url.origin}/api/openapi.json`;
      return new Response(swaggerUiHtml(specUrl), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname.startsWith("/api/v1/")) {
      const restRes = await this.handleRest(req);
      if (restRes) {
        return this.withCors(restRes);
      }
      return this.withCors(Response.json({ success: false, message: "Not found" }, { status: 404 }));
    }

    if (url.pathname.startsWith("/api/trpc")) {
      return this.handleTrpc(req);
    }

    return new Response("Email Parser API — Swagger: /api/docs", { status: 200 });
  }

  start(): Server<undefined> {
    const server = serve({
      port: this.env.port,
      fetch: (req) => this.fetch(req),
    });

    console.log(`[server] Listening on http://localhost:${server.port}`);
    console.log(`[server] Swagger UI: http://localhost:${server.port}/api/docs`);
    return server;
  }
}
