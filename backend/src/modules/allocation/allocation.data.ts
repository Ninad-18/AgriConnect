import { prisma } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { ProcurementForScoring } from "./allocation.engine";

// Loads procurement summary plus verifies the caller is the owner.
export async function loadProcurementForScoring(
  procurementId: string,
  supplierId: string
): Promise<ProcurementForScoring> {
  const req = await prisma.procurementRequest.findUnique({
    where: { id: procurementId },
  });
  if (!req) throw new AppError(404, "Procurement request not found");
  if (req.supplierId !== supplierId) {
    throw new AppError(403, "Not your procurement request");
  }
  return {
    quantityKg: req.quantityKg,
    minGrade: req.minGrade as ProcurementForScoring["minGrade"],
    allowPartial: req.allowPartial,
    deliveryDate: req.deliveryDate,
  };
}

export async function loadSupplierId(procurementId: string): Promise<string> {
  const req = await prisma.procurementRequest.findUnique({
    where: { id: procurementId },
    select: { supplierId: true },
  });
  if (!req) throw new AppError(404, "Procurement request not found");
  return req.supplierId;
}
