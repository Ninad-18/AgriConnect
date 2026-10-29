import {
  AgreementStatus,
  CrossSourceComparison,
  MarketPriceObservation,
  SourceComparisonItem,
} from "../types";

export interface SourceWeightConfig {
  source: string;
  baseReliability: number; // 0.0 - 1.0 (e.g. AGMARKNET official mandi reporting = 0.90)
  isIndependentOf: string[]; // List of sources this source mirrors or derives from
}

export const DEFAULT_SOURCE_CONFIGS: Record<string, SourceWeightConfig> = {
  agmarknet: {
    source: "agmarknet",
    baseReliability: 0.9,
    isIndependentOf: [],
  },
  enam: {
    source: "enam",
    baseReliability: 0.85,
    isIndependentOf: ["agmarknet"], // e-NAM and AGMARKNET share underlying mandi returns in many states
  },
  spot_mandi: {
    source: "spot_mandi",
    baseReliability: 0.8,
    isIndependentOf: [],
  },
  demo_snapshot: {
    source: "demo_snapshot",
    baseReliability: 0.5,
    isIndependentOf: [],
  },
  seed: {
    source: "seed",
    baseReliability: 0.1,
    isIndependentOf: [],
  },
};

/**
 * Checks if two sources are independent or if one is a mirrored / derivative dataset of the other.
 */
export function areSourcesIndependent(sourceA: string, sourceB: string): boolean {
  const normA = sourceA.toLowerCase();
  const normB = sourceB.toLowerCase();
  if (normA === normB) return false;

  const cfgA = DEFAULT_SOURCE_CONFIGS[normA];
  if (cfgA && cfgA.isIndependentOf.includes(normB)) return false;

  const cfgB = DEFAULT_SOURCE_CONFIGS[normB];
  if (cfgB && cfgB.isIndependentOf.includes(normA)) return false;

  return true;
}

/**
 * Calculates freshness penalty based on observation age in days.
 */
export function calculateFreshnessFactor(arrivalDate: string, referenceDate?: string): number {
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const arr = new Date(arrivalDate);
  const diffDays = Math.max(0, Math.floor((ref.getTime() - arr.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return 1.0;
  if (diffDays === 1) return 0.95;
  if (diffDays <= 3) return 0.85;
  if (diffDays <= 7) return 0.7;
  return 0.5;
}

/**
 * Compares compatible observations from multiple sources for the same commodity and geographic scope.
 */
export function compareCrossSourcePrices(
  primaryObs: MarketPriceObservation,
  additionalObs: MarketPriceObservation[],
  customConfigs: Record<string, SourceWeightConfig> = DEFAULT_SOURCE_CONFIGS
): CrossSourceComparison {
  const primarySourceKey = primaryObs.source.toLowerCase();
  const primaryWeightConfig = customConfigs[primarySourceKey] || {
    source: primarySourceKey,
    baseReliability: 0.7,
    isIndependentOf: [],
  };

  const primaryFreshness = calculateFreshnessFactor(primaryObs.arrivalDate);
  const primaryItem: SourceComparisonItem = {
    source: primaryObs.source,
    modalPrice: primaryObs.modalPrice,
    minPrice: primaryObs.minPrice,
    maxPrice: primaryObs.maxPrice,
    arrivalDate: primaryObs.arrivalDate,
    market: primaryObs.market,
    variety: primaryObs.variety,
    weight: primaryWeightConfig.baseReliability * primaryFreshness,
    isIndependent: true,
  };

  // Filter additional observations matching commodity and valid status
  const compatibleCandidates = additionalObs.filter(
    (obs) =>
      obs.validationStatus === "VALID" &&
      obs.commodity.toLowerCase() === primaryObs.commodity.toLowerCase() &&
      obs.id !== primaryObs.id
  );

  if (compatibleCandidates.length === 0) {
    return {
      status: "UNAVAILABLE",
      primarySource: primaryObs.source,
      primaryModalPrice: primaryObs.modalPrice,
      observedSources: [primaryItem],
      minObserved: primaryObs.minPrice,
      maxObserved: primaryObs.maxPrice,
      spreadPct: 0,
      notes: "Cross-source comparison unavailable: only one valid source observed for this commodity/market.",
    };
  }

  const items: SourceComparisonItem[] = [primaryItem];
  const independentSourcesSeen = new Set<string>([primarySourceKey]);

  for (const cand of compatibleCandidates) {
    const candSourceKey = cand.source.toLowerCase();
    const isIndep = areSourcesIndependent(primarySourceKey, candSourceKey);
    const cfg = customConfigs[candSourceKey] || {
      source: candSourceKey,
      baseReliability: 0.6,
      isIndependentOf: [],
    };
    const freshness = calculateFreshnessFactor(cand.arrivalDate, primaryObs.arrivalDate);
    const weight = isIndep ? cfg.baseReliability * freshness : 0; // Mirrored source receives 0 weight in independent estimate

    if (isIndep) {
      independentSourcesSeen.add(candSourceKey);
    }

    items.push({
      source: cand.source,
      modalPrice: cand.modalPrice,
      minPrice: cand.minPrice,
      maxPrice: cand.maxPrice,
      arrivalDate: cand.arrivalDate,
      market: cand.market,
      variety: cand.variety,
      weight,
      isIndependent: isIndep,
    });
  }

  // Calculate stats across all observed sources
  const observedModals = items.map((i) => i.modalPrice);
  const minObserved = Math.min(...items.map((i) => i.minPrice));
  const maxObserved = Math.max(...items.map((i) => i.maxPrice));
  const minModal = Math.min(...observedModals);
  const maxModal = Math.max(...observedModals);

  // Spread percentage relative to primary price
  const spreadPct = primaryObs.modalPrice > 0
    ? Math.round((Math.abs(maxModal - minModal) / primaryObs.modalPrice) * 1000) / 10
    : 0;

  // Determine agreement status
  let status: AgreementStatus = "UNAVAILABLE";
  if (items.length <= 1 || independentSourcesSeen.size < 2) {
    status = "UNAVAILABLE";
  } else if (spreadPct <= 5) {
    status = "HIGH_AGREEMENT";
  } else if (spreadPct <= 15) {
    status = "MODERATE_AGREEMENT";
  } else {
    status = "DISCREPANCY";
  }

  // Calculate weighted estimate only across independent sources with non-zero weight
  let weightedEstimate: number | undefined;
  const eligibleItems = items.filter((i) => i.isIndependent && i.weight > 0);
  const totalWeight = eligibleItems.reduce((acc, curr) => acc + curr.weight, 0);

  if (eligibleItems.length > 1 && totalWeight > 0) {
    const weightedSum = eligibleItems.reduce((acc, curr) => acc + curr.modalPrice * curr.weight, 0);
    weightedEstimate = Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  let discrepancyWarning: string | undefined;
  if (status === "DISCREPANCY") {
    discrepancyWarning = `Material price discrepancy detected (${spreadPct}% spread). Primary ${primaryObs.source}: ₹${primaryObs.modalPrice}/kg vs range ₹${minModal}-₹${maxModal}/kg.`;
  }

  return {
    status,
    primarySource: primaryObs.source,
    primaryModalPrice: primaryObs.modalPrice,
    observedSources: items,
    minObserved,
    maxObserved,
    spreadPct,
    weightedEstimate,
    discrepancyWarning,
    notes:
      status === "UNAVAILABLE"
        ? "No independent secondary source available; relying on verified primary source."
        : `Evaluated across ${items.length} sources (${independentSourcesSeen.size} independent).`,
  };
}
