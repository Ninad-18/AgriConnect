import Redis from "ioredis";
import { env } from "./env";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    client.on("error", (err) => {
      console.error("[redis] error:", err.message);
    });
  }
  return client;
}

export async function connectRedis(): Promise<void> {
  try {
    if (!client) client = getRedis();
    await client.connect();
    console.log("[redis] connected");
  } catch (err) {
    console.warn("[redis] could not connect (continuing without cache):", (err as Error).message);
  }
}

// Cache-aside helpers
export async function cacheGet(key: string): Promise<string | null> {
  try {
    return await getRedis().get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSec = 300): Promise<void> {
  try {
    await getRedis().set(key, value, "EX", ttlSec);
  } catch {
    // non-critical
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await getRedis().del(key);
  } catch {
    // non-critical
  }
}
