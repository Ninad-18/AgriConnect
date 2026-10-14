import { DEFAULT_ALLOCATION_WEIGHTS, meetsMinGrade } from "../../utils/constants";

export interface WeightConfig {
  price: number;
  quality: number;
  quantity: number;
  delivery: number;
  distance: number;
  reliability: number;
}

export interface BidForScoring {
  id: string;
  bidderId: string;
  quantityKg: number;
  pricePerKg: number;
  grade: "A" | "B" | "C";
  declaredOn: Date;
  deliveryDate: Date;
  distanceKm: number | null;
  reliability: number;
}

export interface ProcurementForScoring {
  quantityKg: number;
  minGrade: "A" | "B" | "C";
  allowPartial: boolean;
  deliveryDate: Date;
}

const GRADE_VALUE: Record<"A" | "B" | "C", number> = { A: 1, B: 2 / 3, C: 1 / 3 };

function round(n: number, dp = 4): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

/**
 * Bid Ranking: rank each individual bid on a 0..1 scale (higher = stronger).
 * Weights are configurable and default to price 30%, quality 25%, quantity
 * 15%, delivery 10%, distance 10%, reliability 10%.
 */
export function rankBids(
  bids: BidForScoring[],
  req: ProcurementForScoring,
  weights: WeightConfig = DEFAULT_ALLOCATION_WEIGHTS
) {
  const prices = bids.map((b) => b.pricePerKg);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const scored = bids.map((b) => {
    // Hard filter: must meet minimum grade. Score -1 marks it ineligible.
    if (!meetsMinGrade(b.grade, req.minGrade)) {
      return { ...b, score: -1, eligibilityNote: "below_min_grade" };
    }

    const priceNorm = (b.pricePerKg - minPrice) / priceRange;
    const priceScore = 1 - priceNorm; // lower price => higher score

    const quality = GRADE_VALUE[b.grade];

    // Quantity fit: how well the bid covers the required quantity.
    const qtyFit = req.allowPartial
      ? Math.min(b.quantityKg, req.quantityKg) / req.quantityKg
      : Math.min(b.quantityKg / req.quantityKg, 1);

    // Delivery speed: how close to declared date it delivers relative to window.
    const totalSpan = req.deliveryDate.getTime() - b.declaredOn.getTime() || 1;
    const delivery = Math.max(
      0,
      1 - (b.deliveryDate.getTime() - b.declaredOn.getTime()) / totalSpan
    );

    // Distance: closer to supplier is better (normalized to 200km).
    const dist = b.distanceKm ?? 30;
    const distanceScore = 1 - Math.min(dist, 200) / 200;

    // Reliability: 0..1 (defaulted from farmer reliability 0..100).
    const reliability = (b.reliability ?? 100) / 100;

    const score =
      weights.price * priceScore +
      weights.quality * quality +
      weights.quantity * qtyFit +
      weights.delivery * delivery +
      weights.distance * distanceScore +
      weights.reliability * reliability;

    return {
      ...b,
      score: round(score),
      breakdown: {
        price: round(weights.price * priceScore, 3),
        quality: round(weights.quality * quality, 3),
        quantity: round(weights.quantity * qtyFit, 3),
        delivery: round(weights.delivery * delivery, 3),
        distance: round(weights.distance * distanceScore, 3),
        reliability: round(weights.reliability * reliability, 3),
      },
    };
  });

  const ranked = scored
    .filter((b) => b.score >= 0)
    .sort((a, b) => b.score - a.score);

  return {
    ranked,
    ineligible: scored.filter((b) => b.score < 0),
  };
}

/**
 * Smart Allocation: recommend the combination of ranked bids that best
 * satisfies the required quantity while favoring stronger bids.
 * The system ONLY recommends; the supplier remains the final decision-maker.
 */
export function allocate(
  bids: BidForScoring[],
  req: ProcurementForScoring,
  weights: WeightConfig = DEFAULT_ALLOCATION_WEIGHTS
) {
  const { ranked } = rankBids(bids, req, weights);
  const need = req.quantityKg;
  const chosen: (typeof ranked)[number][] = [];
  let filled = 0;

  for (const b of ranked) {
    if (filled >= need) break;
    // If partial not allowed, don't overshoot with this bid.
    if (!req.allowPartial && filled + b.quantityKg > need) continue;
    chosen.push(b);
    filled += b.quantityKg;
    if (!req.allowPartial && filled >= need) break;
  }

  const totalKg = chosen.reduce((s, b) => s + b.quantityKg, 0);
  const totalCost = chosen.reduce(
    (s, b) => s + Math.min(b.quantityKg, need) * b.pricePerKg,
    0
  );
  const avgPrice = chosen.length
    ? totalCost / chosen.reduce((s, b) => s + Math.min(b.quantityKg, need), 0)
    : 0;

  return {
    recommendedBids: chosen,
    rankedBids: ranked,
    totalKg: round(totalKg),
    totalCost: round(totalCost, 2),
    avgPrice: round(avgPrice, 2),
    coverage: need ? round(Math.min(filled / need, 1) * 100, 1) : 0,
  };
}
