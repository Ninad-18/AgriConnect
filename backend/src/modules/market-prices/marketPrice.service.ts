import { prisma } from "../../config/database";
import { cacheGet, cacheSet, cacheDel } from "../../config/redis";

const TTL = 300; // 5 min cache

/**
 * Cache-aside strategy:
 *   GET price → Redis → HIT: return | MISS: load from source, store, return
 * Market prices don't need the strict consistency of payments/inventory.
 */

export async function listPrices() {
  const cached = await cacheGet("market-prices:all");
  if (cached) return JSON.parse(cached);

  const prices = await prisma.marketPrice.findMany({ orderBy: { crop: "asc" } });
  await cacheSet("market-prices:all", JSON.stringify(prices), TTL);
  return prices;
}

export async function getPrice(crop: string) {
  const key = `market-prices:${crop.toLowerCase()}`;
  const cached = await cacheGet(key);
  if (cached) return JSON.parse(cached);

  const price = await prisma.marketPrice.findFirst({
    where: { crop: { equals: crop, mode: "insensitive" } },
  });
  if (!price) {
    // Future: external AGMARKNET/eNAM fetch + normalization (quintal→kg)
    // Normalization: price per quintal / 100 = price per kg
    return null;
  }
  await cacheSet(key, JSON.stringify(price), TTL);
  return price;
}

export async function getHistory(crop: string) {
  const price = await getPrice(crop);
  if (!price) return null;
  return price.history;
}

export async function refreshPrice(crop: string): Promise<void> {
  await cacheDel(`market-prices:${crop.toLowerCase()}`);
  await cacheDel("market-prices:all");
}

export async function upsertPrice(data: {
  crop: string;
  current: number;
  unit?: string;
  history?: unknown[];
  source?: string;
}) {
  const existing = await prisma.marketPrice.findFirst({ where: { crop: data.crop } });
  const payload = {
    current: data.current,
    unit: data.unit ?? "kg",
    history: (data.history ?? []) as object,
    source: data.source ?? "seed",
  };
  const row = existing
    ? await prisma.marketPrice.update({ where: { id: existing.id }, data: payload })
    : await prisma.marketPrice.create({
        data: { crop: data.crop, ...payload },
      });
  await refreshPrice(data.crop);
  return row;
}
