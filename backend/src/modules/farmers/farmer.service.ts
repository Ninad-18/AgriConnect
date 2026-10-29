import { prisma } from "../../config/database";
import { normalizeCropList } from "../../utils/helpers";
import { UpsertFarmerProfileBody } from "./farmer.validation";
import { calculateReliability } from "./reliability";

export async function getFarmerReliability(userId: string) {
  const contracts = await prisma.farmerContract.findMany({
    where: { farmerId: userId },
    select: {
      status: true, receivedAt: true, deliveredQuantityKg: true, acceptedQuantityKg: true, quantityKg: true,
      procurement: { select: { deliveryDate: true } },
      verifications: { select: { outcome: true, verifiedAt: true, createdAt: true } },
    },
  });
  return calculateReliability(contracts);
}

export async function getFarmerProfile(userId: string) {
  const profile = await prisma.farmerProfile.findUnique({ where: { userId } });
  const base = profile ?? await prisma.farmerProfile.create({ data: { userId, crops: [] } });
  const reliabilitySummary = await getFarmerReliability(userId);
  return { ...base, reliability: reliabilitySummary.score, reliabilitySummary };
}

export async function upsertFarmerProfile(userId: string, body: UpsertFarmerProfileBody) {
  const data = {
    ...body,
    ...(body.crops ? { crops: normalizeCropList(body.crops) } : {}),
  };

  return prisma.farmerProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data, crops: data.crops ?? [] },
  });
}
