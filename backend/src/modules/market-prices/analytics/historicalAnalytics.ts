import { HistoricalAnalytics, MarketPriceHistoryPoint, TrendDirection } from "../types";

/**
 * Calculates trend direction based on first and last prices in slice,
 * with a tolerance threshold (e.g. 1.5% to avoid jitter on small fluctuations).
 */
export function determineTrendDirection(
  startPrice: number,
  endPrice: number,
  thresholdPct = 1.5
): TrendDirection {
  if (startPrice <= 0) return "INSUFFICIENT_DATA";
  const pct = ((endPrice - startPrice) / startPrice) * 100;
  if (pct > thresholdPct) return "UP";
  if (pct < -thresholdPct) return "DOWN";
  return "STABLE";
}

/**
 * Calculates sample standard deviation and coefficient of variation (volatility %).
 */
export function calculateVolatility(prices: number[]): number | null {
  if (prices.length < 2) return null;
  const n = prices.length;
  const mean = prices.reduce((a, b) => a + b, 0) / n;
  if (mean <= 0) return null;

  const variance = prices.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  const cvPct = (stdDev / mean) * 100;
  return Math.round(cvPct * 10) / 10;
}

/**
 * Calculates the duration (in days) of the current consecutive monotonic trend.
 * Scans backwards from the most recent observation to see how many consecutive days
 * the price has been strictly moving in the current direction.
 */
export function calculateConsecutiveTrendDuration(sortedHistory: MarketPriceHistoryPoint[]): number {
  if (sortedHistory.length < 2) return 0;

  const n = sortedHistory.length;
  const lastPrice = sortedHistory[n - 1].price;
  const prevPrice = sortedHistory[n - 2].price;

  if (lastPrice === prevPrice) return 0;
  const isUpward = lastPrice > prevPrice;
  let duration = 1;

  for (let i = n - 2; i > 0; i--) {
    const curr = sortedHistory[i].price;
    const prior = sortedHistory[i - 1].price;
    if (isUpward && curr > prior) {
      duration++;
    } else if (!isUpward && curr < prior) {
      duration++;
    } else {
      break;
    }
  }

  return duration;
}

/**
 * Computes historical analytics from chronologically ordered historical points.
 */
export function computeHistoricalAnalytics(
  rawPoints: MarketPriceHistoryPoint[],
  windowDays = 30
): HistoricalAnalytics {
  // Filter out invalid/zero/negative points and sort chronologically (oldest -> newest)
  const validPoints = (rawPoints || [])
    .filter((pt) => pt && typeof pt.price === "number" && pt.price > 0 && Boolean(pt.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (validPoints.length < 2) {
    const single = validPoints[0];
    return {
      observationCount: validPoints.length,
      windowDays,
      minPrice: single ? single.price : null,
      maxPrice: single ? single.price : null,
      avgPrice: single ? single.price : null,
      latestModalPrice: single ? single.price : null,
      earliestModalPrice: single ? single.price : null,
      absoluteChange: null,
      percentageChange: null,
      trend7d: "INSUFFICIENT_DATA",
      trend30d: "INSUFFICIENT_DATA",
      trend90d: "INSUFFICIENT_DATA",
      volatilityPct: null,
      trendDurationDays: 0,
      status: "INSUFFICIENT_DATA",
    };
  }

  const prices = validPoints.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;

  const latestPt = validPoints[validPoints.length - 1];
  const earliestPt = validPoints[0];

  const latestModalPrice = latestPt.price;
  const earliestModalPrice = earliestPt.price;

  const absoluteChange = Math.round((latestModalPrice - earliestModalPrice) * 100) / 100;
  const percentageChange =
    earliestModalPrice > 0
      ? Math.round(((latestModalPrice - earliestModalPrice) / earliestModalPrice) * 1000) / 10
      : null;

  // Trend for 7-day, 30-day, 90-day based on available observations
  const getSliceTrend = (daysBack: number): TrendDirection => {
    const latestDate = new Date(latestPt.date).getTime();
    const cutoff = latestDate - daysBack * 86400000;
    const windowSlice = validPoints.filter((pt) => new Date(pt.date).getTime() >= cutoff);
    if (windowSlice.length < 2) return "INSUFFICIENT_DATA";
    return determineTrendDirection(windowSlice[0].price, windowSlice[windowSlice.length - 1].price);
  };

  const trend7d = getSliceTrend(7);
  const trend30d = getSliceTrend(30);
  const trend90d = getSliceTrend(90);

  const volatilityPct = calculateVolatility(prices);
  const trendDurationDays = calculateConsecutiveTrendDuration(validPoints);

  return {
    observationCount: validPoints.length,
    windowDays,
    minPrice,
    maxPrice,
    avgPrice,
    latestModalPrice,
    earliestModalPrice,
    absoluteChange,
    percentageChange,
    trend7d,
    trend30d,
    trend90d,
    volatilityPct,
    trendDurationDays,
    status: "CALCULATED",
  };
}
