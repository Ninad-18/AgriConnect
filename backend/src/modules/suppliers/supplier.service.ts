import { prisma } from "../../config/database";
import { UpsertSupplierProfileBody } from "./supplier.validation";

export async function getSupplierProfile(userId: string) {
  return prisma.supplierProfile.findUnique({ where: { userId } });
}

export async function upsertSupplierProfile(userId: string, body: UpsertSupplierProfileBody) {
  return prisma.supplierProfile.upsert({
    where: { userId },
    update: body,
    create: { userId, ...body },
  });
}

// Contracts grouped under a procurement request (per spec: separate orders,
// viewed together under the parent request).
export async function getContractsGroupedByProcurement(supplierId: string) {
  const procurements = await prisma.procurementRequest.findMany({
    where: { supplierId },
    orderBy: { createdAt: "desc" },
    include: {
      product: true,
      contracts: {
        include: {
          farmer: { select: { id: true, name: true } },
          verifications: true,
          payments: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return procurements;
}
