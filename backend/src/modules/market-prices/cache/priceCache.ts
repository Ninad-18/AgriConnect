import { cacheGet, cacheSet, cacheDel } from "../../../config/redis";
import { MarketPriceSummary } from "../types";

export const CACHE_TTL_SECONDS = {
  DAILY_SUMMARY: 1800, // 30 minutes in Redis
  HISTORICAL: 3600, // 1 hour for historical series
  LIST_ALL: 900, // 15 minutes for the main catalogue list
};

export function buildPriceCacheKey(params: {
  crop: string;
  market?: string;
  state?: string;
  date?: string;
  unit?: string;
}): string {
  const parts = [
    "market-prices:summary",
    params.crop.toLowerCase().trim(),
    (params.market || "all").toLowerCase().trim().replace(/\s+/g, "_"),
    (params.state || "all").toLowerCase().trim().replace(/\s+/g, "_"),
    params.date || "latest",
    params.unit || "kg",
  ];
  return parts.join(":");
}

export function buildHistoryCacheKey(crop: string, days = 30): string {
  return `market-prices:history:${crop.toLowerCase().trim()}:${days}`;
}

export const CACHE_KEY_ALL = "market-prices:all";

export interface CachedEnvelope<T> {
  payload: T;
  cachedAt: string;
  isStale?: boolean;
}

/**
 * Retrieves cached item with fallback to stale representation if available.
 */
export async function getCachedPrice<T>(key: string): Promise<{ data: T; isStale: boolean } | null> {
  try {
    const raw = await cacheGet(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEnvelope<T> | T;
    if (parsed && typeof parsed === "object" && "payload" in parsed) {
      return {
        data: (parsed as CachedEnvelope<T>).payload,
        isStale: Boolean((parsed as CachedEnvelope<T>).isStale),
      };
    }
    return { data: parsed as T, isStale: false };
  } catch {
    return null;
  }
}

/**
 * Sets cached item with timestamp envelope.
 */
export async function setCachedPrice<T>(
  key: string,
  payload: T,
  ttlSeconds = CACHE_TTL_SECONDS.DAILY_SUMMARY,
  isStale = false
): Promise<void> {
  try {
    const envelope: CachedEnvelope<T> = {
      payload,
      cachedAt: new Date().toISOString(),
      isStale,
    };
    await cacheSet(key, JSON.stringify(envelope), ttlSeconds);
  } catch {
    // Redis fail-open
  }
}

/**
 * Invalidates cache for a specific crop across all standard keys.
 */
export async function invalidateCropCache(crop: string): Promise<void> {
  const norm = crop.toLowerCase().trim();
  await Promise.all([
    cacheDel(CACHE_KEY_ALL),
    cacheDel(`market-prices:${norm}`),
    cacheDel(`market-prices:summary:${norm}:all:all:latest:kg`),
    cacheDel(buildHistoryCacheKey(norm, 7)),
    cacheDel(buildHistoryCacheKey(norm, 30)),
    cacheDel(buildHistoryCacheKey(norm, 90)),
  ]);
}
