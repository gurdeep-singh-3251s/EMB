import type { Env } from "@repo/config";
import type { AppContext } from "../appContext";
import type { Redis } from "ioredis";

export type TrpcContext = AppContext & {
  env: Env;
  isAuthenticated: boolean;
  redis: Redis | null;
};

export type { AppContext, CreateContextFn } from "../appContext";
