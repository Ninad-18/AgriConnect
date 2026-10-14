import { prisma } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { loadProcurementForScoring, loadSupplierId } from "./allocation.data";
import { allocate, WeightConfig, BidForScoring } from "./allocation.engine";
import { DEFAULT_ALLOCATION_WEIGHTS } from "../../utils/constants";
import { AllocationSnapshot } from "../../config/mongodb.models";

export async function getRecommendations(procurementId: string, supplierId: string) {
  const { req, weights } = await loadForRequest(procurementId, supplierId);
  const bids = await loadBidsForScoring(procurementId);

  if (bids.length === 0) {
    return {
      procurementId,
      weights,
      rankedBids: [],
      recommendedBids: [],
      totalKg: 0,
      totalCost: 0,
      avgPrice: 0,
      coverage: 0,
    };
  }

  const result = allocate(bids, req, weights);

  // Persist an audit snapshot (non-authoritative, Mongo).
  try {
    await AllocationSnapshot.create({
      procurementId,
      weights,
      rankedBids: result.rankedBids,
      recommendedBids: result.recommendedBids,
    });
  } catch {
    // non-critical
  }

  return { procurementId, weights, ...result };
}

async function loadBidsForScoring(procurementId: string): Promise<BidForScoring[]> {
  const bids = await prisma.bid.findMany({
    where: { procurementId, status: { in: ["SUBMITTED", "ACTIVE"] } },
    include: {
      farmer: { include: { farmerProfile: true } },
    },
  });
  return bids.map((b) => ({
    id: b.id,
    bidderId: b.farmerId,
    quantityKg: b.quantityKg,
    pricePerKg: b.pricePerKg,
    grade: b.grade as BidForScoring["grade"],
    declaredOn: b.createdAt,
    deliveryDate: b.deliveryDate,
    distanceKm: b.distanceKm ?? b.farmer?.farmerProfile?.distanceKm ?? 30,
    reliability: b.farmer?.farmerProfile?.reliability ?? 100,
  }));
}

async function loadForRequest(procurementId: string, supplierId: string) {
  const reqData = await loadProcurementForScoring(procurementId, supplierId);
  let weights = { ...DEFAULT_ALLOCATION_WEIGHTS };
  const override = await prisma.allocationWeight.findUnique({
    where: { procurementRequestId: procurementId },
  });
  if (override) {
    weights = {
      price: override.price,
      quality: override.quality,
      quantity: override.quantity,
      delivery: override.delivery,
      distance: override.distance,
      reliability: override.reliability,
    } as WeightConfig;
  }
  return { req: reqData, weights };
}
