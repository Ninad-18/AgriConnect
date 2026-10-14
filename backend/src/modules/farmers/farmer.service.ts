import { prisma } from "../../config/database";
import { UpsertFarmerProfileBody } from "./farmer.validation";

export async function getFarmerProfile(userId: string) {
  return prisma.farmerProfile.findUnique({ where: { userId } });
}

export async function upsertFarmerProfile(userId: string, body: UpsertFarmerProfileBody) {
  return prisma.farmerProfile.upsert({
    where: { userId },
    update: body,
    create: { userId, ...body },
  });
}
