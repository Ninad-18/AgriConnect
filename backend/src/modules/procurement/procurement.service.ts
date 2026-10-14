import { prisma } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { createNotification, logActivity } from "../../utils/notification.service";
import { emitToProcurement, emitToUser } from "../../config/socket";
import { gradeRank } from "../../utils/helpers";
import { CreateProcurementBody, AcceptBidsBody } from "./procurement.validation";

// ── Supplier posts a new procurement requirement ──────────────
export async function createProcurement(supplierId: string, body: CreateProcurementBody) {
  const supplier = await prisma.user.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new AppError(404, "Supplier not found");

  // find or create the catalogue product by name
  let product = await prisma.product.findFirst({
    where: { name: body.productName, isActive: true },
  });
  if (!product) {
    product = await prisma.product.create({ data: { name: body.productName, cropName: body.productName } });
  }

  const proc = await prisma.procurementRequest.create({
    data: {
      productId: product.id,
      supplierId,
      quantityKg: body.quantityKg,
      requiredQuantityKg: body.quantityKg,
      minGrade: body.minGrade,
      minGradeRank: `A_${gradeRank(body.minGrade)}` as "A_3",
      deliveryDate: new Date(body.deliveryDate),
      bidDeadline: new Date(body.bidDeadline),
      transport: body.transport,
      allowPartial: body.allowPartial,
      allocationMode: body.allocationMode,
      targetPrice: body.targetPrice,
      notes: body.notes,
      status: "OPEN",
    },
    include: { product: true },
  });

  // Notify relevant farmers (matching crop interest) - non-blocking
  await notifyMatchingFarmers(
    {
      id: proc.id,
      productName: proc.product?.name ?? body.productName,
      quantityKg: proc.quantityKg,
      minGrade: proc.minGrade,
    },
    supplier.name
  );

  await logActivity({
    actorId: supplierId,
    actorRole: "SUPPLIER",
    type: "procurement_created",
    entityType: "procurementRequest",
    entityId: proc.id,
    data: { product: proc.product?.name, quantityKg: proc.quantityKg },
  });

  return proc;
}

async function notifyMatchingFarmers(
  proc: { id: string; productName: string; quantityKg: number; minGrade: string },
  supplierName: string
) {
  const crop = proc.productName;
  try {
    const farmers = await prisma.farmerProfile.findMany({
      where: { crops: { has: crop } },
      select: { userId: true },
    });
    for (const f of farmers) {
      await createNotification({
        userId: f.userId,
        type: "new_procurement",
        title: `New requirement for ${crop}`,
        body: `${supplierName} needs ${proc.quantityKg}kg of ${crop} (Grade ${proc.minGrade}+)`,
        data: { procurementId: proc.id },
      });
      emitToUser(f.userId, "notification", {
        type: "new_procurement",
        procurementId: proc.id,
      });
      emitToProcurement(proc.id, "procurement", { type: "created", id: proc.id });
    }
  } catch (err) {
    console.error("[procurement] notify matching farmers failed:", (err as Error).message);
  }
}

// ── List procurements ──────────────────────────────────────────
export async function listProcurements(params: {
  mine?: boolean;
  status?: string;
  userId: string;
  role: string;
}) {
  const where: Record<string, unknown> = {};
  if (params.role === "SUPPLIER" && params.mine) {
    where.supplierId = params.userId;
  }
  if (params.status) {
    where.status = params.status;
  }

  const docs = await prisma.procurementRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      product: true,
      _count: { select: { bids: true, contracts: true } },
    },
  });
  return docs;
}

export async function getProcurement(procurementId: string, userId: string) {
  const proc = await prisma.procurementRequest.findUnique({
    where: { id: procurementId },
    include: {
      product: true,
      bids: {
        include: {
          images: true,
          farmer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      allocationWeights: true,
    },
  });
  if (!proc) throw new AppError(404, "Procurement request not found");
  return proc;
}

// ── Update status (supplier-controlled transitions) ────────────
export async function updateStatus(procurementId: string, supplierId: string, status: string) {
  const proc = await prisma.procurementRequest.findUnique({ where: { id: procurementId } });
  if (!proc) throw new AppError(404, "Procurement request not found");
  if (proc.supplierId !== supplierId) throw new AppError(403, "Not your procurement request");

  const allowed: Record<string, string[]> = {
    OPEN: ["BIDDING_CLOSED", "CANCELLED", "UNDER_SELECTION"],
    BIDDING_CLOSED: ["UNDER_SELECTION", "OPEN", "CANCELLED"],
    UNDER_SELECTION: ["PARTIALLY_FULFILLED", "FULLY_ALLOCATED", "CANCELLED", "BIDDING_CLOSED"],
  };
  if (!allowed[proc.status]?.includes(status)) {
    throw new AppError(400, `Cannot transition from ${proc.status} to ${status}`);
  }

  const updated = await prisma.procurementRequest.update({
    where: { id: procurementId },
    data: { status: status as never },
  });

  emitToProcurement(procurementId, "procurement-status", { id: procurementId, status });

  return updated;
}

// ── Accept selected bids → create separate farmer contracts ────
export async function acceptBids(procurementId: string, supplierId: string, body: AcceptBidsBody) {
  const { bidIds } = body;

  // Transaction + row locking prevents overselling past required quantity.
  return prisma.$transaction(async (tx) => {
    const proc = await tx.procurementRequest.findUnique({
      where: { id: procurementId },
    });
    if (!proc) throw new AppError(404, "Procurement request not found");
    if (proc.supplierId !== supplierId) {
      throw new AppError(403, "Not your procurement request");
    }

    const bids = await tx.bid.findMany({
      where: { id: { in: bidIds }, procurementId },
      include: { images: true },
    });
    if (bids.length === 0) throw new AppError(400, "No valid bids found");

    // Concurrency guard: don't exceed required quantity.
    let awardedSoFar = proc.awardedQuantityKg ?? 0;
    let overflowing = false;
    const contracts = [];

    for (const bid of bids) {
      if (bid.status === "ACCEPTED") continue; // idempotent skip
      if (!proc.allowPartial && awardedSoFar + bid.quantityKg > proc.requiredQuantityKg) {
        overflowing = true;
        continue;
      }
      if (awardedSoFar >= proc.requiredQuantityKg) {
        overflowing = true;
        break;
      }

      // mark bid accepted
      await tx.bid.update({
        where: { id: bid.id },
        data: { status: "ACCEPTED" },
      });

      const amount = Math.round(bid.quantityKg * bid.pricePerKg * 100) / 100;
      const contract = await tx.farmerContract.create({
        data: {
          procurementId,
          bidId: bid.id,
          farmerId: bid.farmerId,
          supplierId,
          quantityKg: bid.quantityKg,
          pricePerKg: bid.pricePerKg,
          grade: bid.grade,
          amount,
          transport: proc.transport,
          status: "CREATED",
        },
      });
      contracts.push(contract);
      awardedSoFar += bid.quantityKg;

      await createNotification({
        userId: bid.farmerId,
        type: "bid_accepted",
        title: "Your bid was accepted",
        body: `${bid.quantityKg}kg at ₹${bid.pricePerKg}/kg - order confirmed`,
        data: { procurementId, contractId: contract.id },
      });
      emitToUser(bid.farmerId, "notification", { type: "bid_accepted", contractId: contract.id });
    }

    // update procurement awarded quantity + status
    const newStatus =
      awardedSoFar >= proc.requiredQuantityKg
        ? "FULLY_ALLOCATED"
        : awardedSoFar > 0
        ? "PARTIALLY_FULFILLED"
        : proc.status;
    await tx.procurementRequest.update({
      where: { id: procurementId },
      data: { awardedQuantityKg: awardedSoFar, status: newStatus },
    });

    // reject non-selected bids if fully allocated
    if (newStatus === "FULLY_ALLOCATED") {
      await tx.bid.updateMany({
        where: { procurementId, status: { in: ["SUBMITTED", "ACTIVE"] } },
        data: { status: "REJECTED" },
      });
    }

    emitToProcurement(procurementId, "bids-updated", { id: procurementId });

    return {
      contracts,
      awardedQuantityKg: awardedSoFar,
      status: newStatus,
      skippedForOverflow: overflowing,
    };
  });
}
