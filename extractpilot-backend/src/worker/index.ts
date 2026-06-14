import { createDb } from "@repo/db";
import { loadEnv } from "@repo/config";
import ServiceProvider from "./serviceProvider";
import { startEmailProcessingWorker } from "./worker";

const env = loadEnv();
const db = createDb(env.databaseUrl);
const serviceProvider = new ServiceProvider(env, db);

startEmailProcessingWorker(env, serviceProvider);
