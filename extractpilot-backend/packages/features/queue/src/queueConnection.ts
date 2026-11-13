import { Redis } from "ioredis";

export function createRedisConnection(redisUrl: string) {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
    retryStrategy(times) {
      return Math.min(times * 150, 3000);
    },
  });

  client.on("error", (err) => {
    console.warn(`[redis] Connection issue (${redisUrl}): ${err.message}`);
  });

  return client;
}
