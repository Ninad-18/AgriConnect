import { prisma } from "../../config/database";
import {
  buildHistoryCacheKey,
  buildPriceCacheKey,
  CACHE_KEY_ALL,
  CACHE_TTL_SECONDS,
  getCachedPrice,
  invalidateCropCache,
  setCachedPrice,
} from "./cache/priceCache";
import { defaultRegistry } from "./providers/provider.registry";
import { compareCrossSourcePrices } from "./comparison/priceComparison";
import { computeHistoricalAnalytics } from "./analytics/historicalAnalytics";
import { detectPriceAnomaly } from "./anomalies/anomalyDetector";
import { assessWeatherRisk } from "./weather/weatherRisk.service";
import { getSeasonalFactors } from "./calendar/seasonalCalendar";
import { MarketPriceHistoryPoint, MarketPriceObservation, MarketPriceSummary } from "./types";
import { COMMODITY_SNAPSHOTS } from "./providers/snapshot.provider";

const DEFAULT_CROPS = [
  "Onion",
  "Tomato",
  "Potato",
  "Wheat",
  "Rice",
  "Green Chilli",
  "Cauliflower",
  "Sugarcane",
];

/**
 * Builds an enriched MarketPriceSummary from raw observations and history points.
 */
export async function buildPriceSummary(
  crop: string,
  primaryObs?: MarketPriceObservation,
  secondaryObs: MarketPriceObservation[] = [],
  historyPoints: MarketPriceHistoryPoint[] = [],
  existingDbRow?: {
    id?: string;
    current?: number;
    avg30d?: number | null;
    min30d?: number | null;
    max30d?: number | null;
    source?: string;
    updatedAt?: Date;
  }
): Promise<MarketPriceSummary> {
  const normCrop = crop.trim();

  // If no primary observation is passed, fallback to historical latest or db current
  const latestHist = historyPoints.length > 0 ? historyPoints[historyPoints.length - 1] : null;
  const currentModal = primaryObs?.modalPrice ?? latestHist?.price ?? existingDbRow?.current ?? 0;
  const minPrice = primaryObs?.minPrice ?? (latestHist?.min ?? currentModal);
  const maxPrice = primaryObs?.maxPrice ?? (latestHist?.max ?? currentModal);

  // 1. Cross-Source Comparison
  const comparison = primaryObs
    ? compareCrossSourcePrices(primaryObs, secondaryObs)
    : undefined;

  // 2. Historical Analytics
  const analytics = computeHistoricalAnalytics(historyPoints, 30);

  // 3. Robust Anomaly Detection (MAD)
  const anomaly = detectPriceAnomaly(currentModal, historyPoints);

  // 4. Decoupled Weather Risk Assessment
  const weatherRisk = await assessWeatherRisk(
    normCrop,
    primaryObs?.state || "Maharashtra"
  );

  // 5. Seasonal / Festival Calendar Context
  const seasonalContext = getSeasonalFactors(normCrop);

  // 6. Source Provenance
  const provenance = primaryObs
    ? {
        provider: primaryObs.source,
        dataset: primaryObs.dataset,
        sourceObservationId: primaryObs.sourceObservationId,
        retrievalTime: primaryObs.retrievedAt,
        reportingDate: primaryObs.arrivalDate,
        rawUnit: primaryObs.rawUnit || "kg",
        rawMinPrice: primaryObs.rawMinPrice,
        rawMaxPrice: primaryObs.rawMaxPrice,
        rawModalPrice: primaryObs.rawModalPrice,
        conversionFactor: primaryObs.rawUnit === "Quintal" ? 0.01 : 1,
      }
    : undefined;

  const id = existingDbRow?.id || primaryObs?.id || `price_${normCrop.toLowerCase()}`;
  const isDemo = primaryObs?.isDemo ?? (primaryObs?.source?.includes("demo") || primaryObs?.source?.includes("seed") || false);

  return {
    // Backward-compatible fields
    id,
    crop: normCrop,
    unit: "kg",
    currency: "INR",
    current: currentModal,
    avg30d: analytics.avgPrice ?? existingDbRow?.avg30d ?? null,
    min30d: analytics.minPrice ?? existingDbRow?.min30d ?? null,
    max30d: analytics.maxPrice ?? existingDbRow?.max30d ?? null,
    source: primaryObs?.source || existingDbRow?.source || "agmarknet",
    history: historyPoints,
    updatedAt: existingDbRow?.updatedAt ? existingDbRow.updatedAt.toISOString() : new Date().toISOString(),

    // Enriched intelligence fields
    commodity: primaryObs?.commodity || normCrop,
    variety: primaryObs?.variety,
    market: primaryObs?.market,
    state: primaryObs?.state,
    arrivalDate: primaryObs?.arrivalDate,
    minPrice,
    maxPrice,
    modalPrice: currentModal,
    provenance,
    comparison,
    analytics,
    anomaly,
    weatherRisk,
    seasonalContext,
    isDemo,
    stale: false,
    sourcesAvailable: comparison?.observedSources.map((s) => s.source),
  };
}

/**
 * Lists all market prices with full multi-source intelligence.
 * Compatible with existing GET /market-prices
 */
export async function listPrices(): Promise<MarketPriceSummary[]> {
  const cached = await getCachedPrice<MarketPriceSummary[]>(CACHE_KEY_ALL);
  if (cached && cached.data) {
    return cached.data;
  }

  // Load database rows to preserve IDs and existing crops
  const dbRows = await prisma.marketPrice.findMany({ orderBy: { crop: "asc" } });
  const dbMap = new Map(dbRows.map((r) => [r.crop.toLowerCase(), r]));

  // Query providers for latest observations
  const { primaryObservations, secondaryObservations } = await defaultRegistry.queryAll();
  const primaryMap = new Map(primaryObservations.map((obs) => [obs.commodity.toLowerCase(), obs]));

  // Combine known crops
  const cropSet = new Set<string>([
    ...DEFAULT_CROPS,
    ...dbRows.map((r) => r.crop),
    ...primaryObservations.map((o) => o.commodity),
  ]);

  const results: MarketPriceSummary[] = [];

  for (const cropName of cropSet) {
    const key = cropName.toLowerCase();
    const dbRow = dbMap.get(key);
    const primaryObs = primaryMap.get(key);
    const secObs = secondaryObservations.filter((s) => s.commodity.toLowerCase() === key);

    // Extract history points from DB or snapshot provider
    let historyPoints: MarketPriceHistoryPoint[] = [];
    if (dbRow && Array.isArray(dbRow.history) && dbRow.history.length > 0) {
      historyPoints = dbRow.history as unknown as MarketPriceHistoryPoint[];
    } else {
      const snap = await defaultRegistry.getProvider("demo_snapshot")?.fetchHistoricalPrices(cropName);
      if (snap && snap.length > 0) {
        historyPoints = snap.map((s) => ({
          date: s.arrivalDate,
          price: s.modalPrice,
          min: s.minPrice,
          max: s.maxPrice,
        }));
      }
    }

    const summary = await buildPriceSummary(
      cropName,
      primaryObs,
      secObs,
      historyPoints,
      dbRow
    );

    results.push(summary);

    // Sync database cache row in background if row exists or create if missing
    try {
      await prisma.marketPrice.upsert({
        where: { id: summary.id },
        update: {
          current: summary.current,
          avg30d: summary.avg30d,
          min30d: summary.min30d,
          max30d: summary.max30d,
          source: summary.source,
          history: summary.history as object,
        },
        create: {
          id: summary.id,
          crop: summary.crop,
          unit: "kg",
          currency: "INR",
          current: summary.current,
          avg30d: summary.avg30d,
          min30d: summary.min30d,
          max30d: summary.max30d,
          source: summary.source,
          history: summary.history as object,
        },
      });
    } catch {
      // Non-critical background DB sync
    }
  }

  // Sort alphabetically by crop
  results.sort((a, b) => a.crop.localeCompare(b.crop));

  await setCachedPrice(CACHE_KEY_ALL, results, CACHE_TTL_SECONDS.LIST_ALL);
  return results;
}

/**
 * Gets market price and intelligence for a specific crop.
 * Compatible with existing GET /market-prices/:crop
 */
export async function getPrice(
  crop: string,
  options?: { market?: string; state?: string }
): Promise<MarketPriceSummary | null> {
  const normCrop = crop.trim();
  const cacheKey = buildPriceCacheKey({
    crop: normCrop,
    market: options?.market,
    state: options?.state,
  });

  const cached = await getCachedPrice<MarketPriceSummary>(cacheKey);
  if (cached && cached.data) {
    return cached.data;
  }

  // 1. Check database for existing crop record
  const dbRow = await prisma.marketPrice.findFirst({
    where: { crop: { equals: normCrop, mode: "insensitive" } },
  });

  // 2. Query provider registry
  const { primaryObservations, secondaryObservations } = await defaultRegistry.queryAll({
    crop: normCrop,
    market: options?.market,
    state: options?.state,
  });

  const primaryObs = primaryObservations.find(
    (o) => o.commodity.toLowerCase() === normCrop.toLowerCase()
  );

  if (!primaryObs && !dbRow) {
    // Check if we have a benchmark snapshot profile
    const snapProfile = COMMODITY_SNAPSHOTS[normCrop.toLowerCase()];
    if (!snapProfile) {
      return null;
    }
  }

  // 3. Gather historical points
  let historyPoints: MarketPriceHistoryPoint[] = [];
  if (dbRow && Array.isArray(dbRow.history) && dbRow.history.length > 0) {
    historyPoints = dbRow.history as unknown as MarketPriceHistoryPoint[];
  } else {
    const snapHistory = await defaultRegistry
      .getProvider("demo_snapshot")
      ?.fetchHistoricalPrices(normCrop, options?.market, 30);
    if (snapHistory && snapHistory.length > 0) {
      historyPoints = snapHistory.map((s) => ({
        date: s.arrivalDate,
        price: s.modalPrice,
        min: s.minPrice,
        max: s.maxPrice,
      }));
    }
  }

  const summary = await buildPriceSummary(
    normCrop,
    primaryObs,
    secondaryObservations,
    historyPoints,
    dbRow || undefined
  );

  await setCachedPrice(cacheKey, summary, CACHE_TTL_SECONDS.DAILY_SUMMARY);
  return summary;
}

/**
 * Returns historical price points for a crop.
 * Compatible with existing GET /market-prices/history/:crop
 */
export async function getHistory(
  crop: string,
  days = 30
): Promise<MarketPriceHistoryPoint[] | null> {
  const cacheKey = buildHistoryCacheKey(crop, days);
  const cached = await getCachedPrice<MarketPriceHistoryPoint[]>(cacheKey);
  if (cached && cached.data) {
    return cached.data;
  }

  const summary = await getPrice(crop);
  if (!summary) return null;

  const points = (summary.history || []).slice(-days);
  await setCachedPrice(cacheKey, points, CACHE_TTL_SECONDS.HISTORICAL);
  return points;
}

/**
 * Refreshes cache for a crop.
 */
export async function refreshPrice(crop: string): Promise<void> {
  await invalidateCropCache(crop);
}

/**
 * Backward-compatible upsertPrice method.
 */
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
    source: data.source ?? "manual",
  };
  const row = existing
    ? await prisma.marketPrice.update({ where: { id: existing.id }, data: payload })
    : await prisma.marketPrice.create({
        data: { crop: data.crop, ...payload },
      });

  await refreshPrice(data.crop);
  return row;
}
