import { AnomalyResult, AnomalySeverity, AnomalyType, MarketPriceHistoryPoint } from "../types";

export interface AnomalyThresholds {
  minHistoricalSamples: number; // default: 7
  watchZScore: number; // default: 2.0
  anomalyZScore: number; // default: 3.5
  maxDeviationPct: number; // default: 40%
}

export const DEFAULT_ANOMALY_THRESHOLDS: AnomalyThresholds = {
  minHistoricalSamples: 7,
  watchZScore: 2.0,
  anomalyZScore: 3.5,
  maxDeviationPct: 40,
};

function calculateMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Detects whether a price is an anomaly using Median Absolute Deviation (MAD).
 */
export function detectPriceAnomaly(
  candidatePrice: number,
  history: MarketPriceHistoryPoint[],
  thresholds: AnomalyThresholds = DEFAULT_ANOMALY_THRESHOLDS
): AnomalyResult {
  const validPrices = history
    .filter((pt) => pt && typeof pt.price === "number" && pt.price > 0)
    .map((pt) => pt.price);

  if (validPrices.length < thresholds.minHistoricalSamples) {
    return {
      severity: "NORMAL",
      type: "NONE",
      score: 0,
      medianBaseline: null,
      mad: null,
      isAnomaly: false,
      explanation: `Insufficient historical baseline (${validPrices.length}/${thresholds.minHistoricalSamples} required samples).`,
    };
  }

  const median = calculateMedian(validPrices);
  if (median <= 0) {
    return {
      severity: "NORMAL",
      type: "NONE",
      score: 0,
      medianBaseline: null,
      mad: null,
      isAnomaly: false,
      explanation: "Historical median is non-positive.",
    };
  }

  const absoluteDeviations = validPrices.map((p) => Math.abs(p - median));
  const mad = calculateMedian(absoluteDeviations);

  let modifiedZScore = 0;
  if (mad > 0) {
    modifiedZScore = (0.6745 * Math.abs(candidatePrice - median)) / mad;
  } else {
    // If MAD is 0 (prices were constant), evaluate percentage deviation from constant median
    const pctDiff = Math.abs(candidatePrice - median) / median;
    modifiedZScore = pctDiff > 0.1 ? 4.0 : 0;
  }

  const deviationPct = Math.round(((candidatePrice - median) / median) * 1000) / 10;
  let severity: AnomalySeverity = "NORMAL";
  let type: AnomalyType = "NONE";

  if (
    modifiedZScore >= thresholds.anomalyZScore ||
    Math.abs(deviationPct) >= thresholds.maxDeviationPct
  ) {
    severity = "ANOMALY";
    type = candidatePrice > median ? "SPIKE" : "CRASH";
  } else if (modifiedZScore >= thresholds.watchZScore || Math.abs(deviationPct) >= 20) {
    severity = "WATCH";
    type = candidatePrice > median ? "SPIKE" : "CRASH";
  }

  const roundedScore = Math.round(modifiedZScore * 100) / 100;
  const isAnomaly = severity === "ANOMALY";

  let explanation = "Price is within normal historical baseline fluctuations.";
  if (isAnomaly) {
    explanation = `Unusual price ${type.toLowerCase()} detected: ₹${candidatePrice}/kg deviates ${deviationPct > 0 ? "+" : ""}${deviationPct}% from median ₹${median.toFixed(2)}/kg (MAD score: ${roundedScore}).`;
  } else if (severity === "WATCH") {
    explanation = `Moderate price movement on watch: ₹${candidatePrice}/kg deviates ${deviationPct > 0 ? "+" : ""}${deviationPct}% from median ₹${median.toFixed(2)}/kg.`;
  }

  return {
    severity,
    type,
    score: roundedScore,
    medianBaseline: Math.round(median * 100) / 100,
    mad: Math.round(mad * 100) / 100,
    isAnomaly,
    explanation,
    evidence: {
      latestPrice: candidatePrice,
      baselinePrice: Math.round(median * 100) / 100,
      deviationPct,
      sampleSize: validPrices.length,
    },
  };
}
