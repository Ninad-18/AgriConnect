import { prisma } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { createNotification, logActivity } from "../../utils/notification.service";
import { emitToUser } from "../../config/socket";
import { VERIFICATION_OUTCOME, ContractStatus } from "../../utils/constants";
import { VerifyQualityBody } from "./quality.validation";

/**
 * Ownership transfer: produce becomes supplier inventory only after
 * physical delivery AND supplier quality verification (ACCEPTED/ADJUSTED).
 * On REJECTED/DISPUTED, ownership remains with the farmer.
 */

// Step 1: mark the farmer contract as received (produce physically delivered)
export async function receiveProduce(
  contractId: string,
  supplierId: string,
  receivedQuantityKg?: number
) {
  return prisma.$transaction(async (tx) => {
    const contract = await tx.farmerContract.findUnique({ where: { id: contractId } });
    if (!contract) throw new AppError(404, "Contract not found");
    if (contract.supplierId !== supplierId) throw new AppError(403, "Not your contract");
    if (contract.status === "FAILED" || contract.status === "CANCELLED") {
      throw new AppError(400, "Contract is not active");
    }
    if (contract.status !== "CREATED" && contract.status !== "ACCEPTED" && contract.status !== "IN_DELIVERY") {
      throw new AppError(400, `Cannot receive produce from status ${contract.status}`);
    }
    const qty = receivedQuantityKg ?? contract.quantityKg;
    if (qty > contract.quantityKg) {
      throw new AppError(400, "Received quantity exceeds contract quantity");
    }

    const updated = await tx.farmerContract.update({
      where: { id: contractId },
      data: {
        status: "RECEIVED" as ContractStatus,
        deliveredQuantityKg: qty,
        receivedAt: new Date(),
      },
    });

    await createNotification({
      userId: contract.farmerId,
      type: "produce_received",
      title: "Produce received",
      body: `${qty}kg received by supplier`,
      data: { contractId },
    });

    return updated;
  });
}

// Step 2: supplier verifies quality → controls ownership + inventory transfer
export async function verifyQuality(
  contractId: string,
  supplierId: string,
  body: VerifyQualityBody
) {
  return prisma.$transaction(async (tx) => {
    const contract = await tx.farmerContract.findUnique({ where: { id: contractId } });
    if (!contract) throw new AppError(404, "Contract not found");
    if (contract.supplierId !== supplierId) throw new AppError(403, "Not your contract");

    if (contract.status === "CREATED" || contract.status === "ACCEPTED") {
      throw new AppError(400, "Produce must be received before verification");
    }

    // create verification record
    await tx.qualityVerification.create({
      data: {
        contractId,
        verifierId: supplierId,
        declaredGrade: contract.grade,
        actualGrade: body.actualGrade,
        outcome: body.outcome,
        adjustedPriceKg: body.adjustedPriceKg,
        notes: body.notes,
        verifiedAt: new Date(),
      },
    });

    let acceptedQuantity = body.acceptedQuantityKg ?? contract.deliveredQuantityKg ?? contract.quantityKg;
    acceptedQuantity = Math.min(acceptedQuantity, contract.deliveredQuantityKg || contract.quantityKg);

    switch (body.outcome) {
      case VERIFICATION_OUTCOME.ACCEPTED:
        await tx.farmerContract.update({
          where: { id: contractId },
          data: {
            status: "QUALITY_VERIFIED",
            acceptedQuantityKg: acceptedQuantity,
            verifiedAt: new Date(),
          },
        });
        if (acceptedQuantity > 0) {
          await addToInventory(tx, {
            supplierId,
            contractId,
            cropName: await getCropName(contractId),
            grade: body.actualGrade ?? contract.grade,
            quantityKg: acceptedQuantity,
          });
        }
        sendNotification(contract.farmerId, "quality_verified", "Quality accepted", `${acceptedQuantity}kg accepted into inventory`);
        break;

      case VERIFICATION_OUTCOME.ADJUSTED:
        await tx.farmerContract.update({
          where: { id: contractId },
          data: {
            status: "QUALITY_VERIFIED",
            acceptedQuantityKg: acceptedQuantity,
            verifiedAt: new Date(),
          },
        });
        if (acceptedQuantity > 0) {
          await addToInventory(tx, {
            supplierId,
            contractId,
            cropName: await getCropName(contractId),
            grade: body.actualGrade ?? contract.grade,
            quantityKg: acceptedQuantity,
          });
        }
        sendNotification(contract.farmerId, "quality_adjusted", "Quality adjusted", `${acceptedQuantity}kg accepted at adjusted price`);
        break;

      case VERIFICATION_OUTCOME.REJECTED:
        await tx.farmerContract.update({
          where: { id: contractId },
          data: { status: "FAILED", verifiedAt: new Date() },
        });
        // ownership stays with farmer; no inventory transfer
        sendNotification(contract.farmerId, "quality_rejected", "Produce rejected", "Ownership remains with farmer");
        // Reliability is calculated from verified contract history when it is
        // read; this rejected outcome is therefore reflected without a mutable
        // counter that can drift or double-count repeated verification calls.
        break;

      case VERIFICATION_OUTCOME.DISPUTED:
        await tx.farmerContract.update({
          where: { id: contractId },
          data: { status: "QUALITY_VERIFIED" },
        });
        sendNotification(contract.farmerId, "quality_disputed", "Quality disputed", "Awaiting resolution");
        break;
    }

    await logActivity({
      actorId: supplierId,
      actorRole: "SUPPLIER",
      type: "quality_verified",
      entityType: "contract",
      entityId: contractId,
      data: { outcome: body.outcome },
    });

    return tx.qualityVerification.findFirst({
      where: { contractId },
      orderBy: { createdAt: "desc" },
    });
  });
}

async function getCropName(contractId: string): Promise<string> {
  const contract = await prisma.farmerContract.findUnique({
    where: { id: contractId },
    include: { procurement: { include: { product: true } } },
  });
  return contract?.procurement.product.name ?? "produce";
}

interface AddInvParams {
  supplierId: string;
  contractId: string;
  cropName: string;
  grade: string;
  quantityKg: number;
}

// Add accepted quantity to supplier inventory (within the same tx)
async function addToInventory(
  tx: PrismaTx,
  params: AddInvParams
) {
  const { supplierId, contractId, cropName, grade, quantityKg } = params;
  let item = await tx.inventoryItem.findFirst({
    where: { supplierId, contractId, cropName, grade: grade as never },
  });
  if (item) {
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantityKg: item.quantityKg + quantityKg, status: "AVAILABLE" },
    });
  } else {
    item = await tx.inventoryItem.create({
      data: {
        supplierId,
        contractId,
        cropName,
        grade: grade as never,
        quantityKg,
        status: "AVAILABLE",
      },
    });
  }
  return item;
}

async function sendNotification(
  userId: string,
  type: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const { createNotification } = await import("../../utils/notification.service");
    await createNotification({ userId, type, title, body });
    emitToUser(userId, "notification", { type, title });
  } catch {
    // non-critical
  }
}

// Transaction client type alias (Prisma)
type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
