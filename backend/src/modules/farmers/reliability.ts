/**
 * Reliability is deliberately calculated from contract evidence, not from
 * account age or profile completion. The thresholds below are product policy
 * defaults and can be moved to configuration when the platform has data to
 * calibrate them.
 */
export const RELIABILITY_POLICY = {
  minimumResolvedTransactions: 3,
  highConfidenceTransactions: 10,
  componentWeights: {
    fulfilment: 35,
    onTime: 25,
    quality: 20,
    conduct: 15,
    history: 5,
  },
} as const;

type Verification = {
  outcome: "ACCEPTED" | "ADJUSTED" | "REJECTED" | "DISPUTED" | "PENDING";
  verifiedAt: Date | null;
  createdAt: Date;
};

export type ReliabilityContract = {
  status: "COMPLETED" | "QUALITY_VERIFIED" | "FAILED" | "CANCELLED" | string;
  receivedAt: Date | null;
  deliveredQuantityKg: number;
  acceptedQuantityKg: number;
  quantityKg: number;
  procurement: { deliveryDate: Date };
  verifications: Verification[];
};

export type ReliabilitySummary = {
  score: number | null;
  transactionCount: number;
  confidence: "insufficient" | "low" | "medium" | "high";
  explanation: string;
  components: Partial<Record<keyof typeof RELIABILITY_POLICY.componentWeights, number>>;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

function latestVerification(contract: ReliabilityContract): Verification | undefined {
  return [...contract.verifications]
    .filter((verification) => verification.outcome !== "PENDING")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

export function calculateReliability(contracts: ReliabilityContract[]): ReliabilitySummary {
  // A transaction is counted once, using its latest non-pending verification.
  const evidence = contracts
    .map((contract) => ({ contract, verification: latestVerification(contract) }))
    .filter(({ contract, verification }) =>
      Boolean(verification) || contract.status === "CANCELLED" || contract.status === "FAILED"
    );
  const transactionCount = evidence.length;

  if (transactionCount < RELIABILITY_POLICY.minimumResolvedTransactions) {
    return {
      score: null,
      transactionCount,
      confidence: "insufficient",
      explanation: `Insufficient history: ${RELIABILITY_POLICY.minimumResolvedTransactions} resolved, verified transactions are required.`,
      components: {},
    };
  }

  const successful = evidence.filter(({ verification }) =>
    verification?.outcome === "ACCEPTED" || verification?.outcome === "ADJUSTED"
  );
  const components: ReliabilitySummary["components"] = {
    fulfilment: successful.length / transactionCount,
    conduct: 1 - evidence.filter(({ contract, verification }) =>
      contract.status === "CANCELLED" || verification?.outcome === "REJECTED" || verification?.outcome === "DISPUTED"
    ).length / transactionCount,
    history: Math.min(transactionCount / RELIABILITY_POLICY.highConfidenceTransactions, 1),
  };

  const onTime = successful.filter(({ contract }) => contract.receivedAt !== null);
  if (onTime.length) {
    components.onTime = onTime.filter(({ contract }) =>
      contract.receivedAt!.getTime() <= contract.procurement.deliveryDate.getTime()
    ).length / onTime.length;
  }

  const quality = successful.filter(({ contract }) => contract.deliveredQuantityKg > 0 || contract.quantityKg > 0);
  if (quality.length) {
    components.quality = quality.reduce((total, { contract, verification }) => {
      const delivered = contract.deliveredQuantityKg || contract.quantityKg;
      const acceptedRatio = delivered > 0 ? clamp(contract.acceptedQuantityKg / delivered) : 0;
      // Adjusted quality is still a verified transaction, but only earns the
      // accepted-quantity ratio; rejected/disputed outcomes never enter here.
      return total + acceptedRatio;
    }, 0) / quality.length;
  }

  let weightedTotal = 0;
  let availableWeight = 0;
  for (const [name, weight] of Object.entries(RELIABILITY_POLICY.componentWeights) as [keyof typeof RELIABILITY_POLICY.componentWeights, number][]) {
    const value = components[name];
    if (value !== undefined) {
      weightedTotal += clamp(value) * weight;
      availableWeight += weight;
    }
  }
  const score = Math.round(clamp(weightedTotal / availableWeight) * 100);
  const confidence = transactionCount >= RELIABILITY_POLICY.highConfidenceTransactions
    ? "high"
    : transactionCount >= 5 ? "medium" : "low";
  return {
    score,
    transactionCount,
    confidence,
    explanation: "Based on fulfilment (35%), on-time receipt (25%), accepted quality quantity (20%), cancellation/dispute history (15%), and verified history (5%). Unavailable components are excluded and the remaining weights are rebalanced.",
    components: Object.fromEntries(Object.entries(components).map(([key, value]) => [key, Math.round(value * 100)])),
  };
}
