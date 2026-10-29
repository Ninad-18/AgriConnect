import { prisma } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { gradeRank, toGradeRank } from "../../utils/helpers";
import { createNotification, logActivity } from "../../utils/notification.service";
import { emitToProcurement, emitToUser } from "../../config/socket";
import { CreateBidBody, UpdateBidBody } from "./bidding.validation";
import { getBidAssessments } from "../quality/quality-assessment.service";

// ── Farmer submits a bid ─────────────────────────────────────
export async function createBid(farmerId: string, body: CreateBidBody, imageUrls: string[] = []) {
  const proc = await prisma.procurementRequest.findUnique({ where: { id: body.procurementId } });
  if (!proc) throw new AppError(404, "Procurement request not found");
  if (proc.status !== "OPEN") {
    throw new AppError(400, "This procurement is no longer accepting bids");
  }
  if (new Date() > proc.bidDeadline) {
    throw new AppError(400, "Bid deadline has passed");
  }
  // must meet minimum grade
  if (gradeRank(body.grade) < gradeRank(proc.minGrade)) {
    throw new AppError(400, `Bid grade must be at least ${proc.minGrade}`);
  }

  const existingBid = await prisma.bid.findFirst({
    where: {
      procurementId: proc.id,
      farmerId,
      status: { in: ["SUBMITTED", "ACTIVE"] },
    },
    select: { id: true },
  });
  if (existingBid) {
    throw new AppError(409, "You already have an active bid for this procurement. Edit that bid instead.");
  }

  const farm = await prisma.farmerProfile.findUnique({ where: { userId: farmerId } });

  const bid = await prisma.bid.create({
    data: {
      procurementId: proc.id,
      farmerId,
      quantityKg: body.quantityKg,
      pricePerKg: body.pricePerKg,
      grade: body.grade,
      gradeRank: toGradeRank(body.grade),
      deliveryDate: new Date(body.deliveryDate),
      note: body.note,
      status: "ACTIVE",
      supplierId: proc.supplierId,
      distanceKm: farm?.distanceKm ?? 25,
      farmLocation: farm?.location ?? null,
      images: imageUrls.length
        ? { create: imageUrls.map((url) => ({ url })) }
        : undefined,
    },
    include: { images: true },
  });

  // notify supplier of new bid
  await createNotification({
    userId: proc.supplierId,
    type: "new_bid",
    title: `New bid on ${body.grade} grade produce`,
    body: `₹${body.pricePerKg}/kg for ${body.quantityKg}kg (Grade ${body.grade})`,
    data: { procurementId: proc.id, bidId: bid.id },
  });
  emitToUser(proc.supplierId, "notification", {
    type: "new_bid",
    procurementId: proc.id,
    bidId: bid.id,
  });
  emitToProcurement(proc.id, "bid-created", { bidId: bid.id });

  await logActivity({
    actorId: farmerId,
    actorRole: "FARMER",
    type: "bid_submitted",
    entityType: "bid",
    entityId: bid.id,
    data: { procurementId: proc.id, pricePerKg: body.pricePerKg },
  });

  return bid;
}

// ── Farmer's own bids ─────────────────────────────────────────
export async function myBids(farmerId: string) {
  const bids = await prisma.bid.findMany({
    where: { farmerId },
    orderBy: { createdAt: "desc" },
    include: {
      procurement: { include: { product: true } },
      images: true,
      contracts: true,
    },
  });
  const assessments = await getBidAssessments(bids.map((bid) => bid.id));
  return bids.map((bid) => ({ ...bid, qualityAssessments: assessments.get(bid.id) ?? [] }));
}

export async function getBid(bidId: string, userId: string, role: string) {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: {
      procurement: { include: { product: true } },
      images: true,
      farmer: { select: { id: true, name: true } },
    },
  });
  if (!bid) throw new AppError(404, "Bid not found");

  // Open bidding: farmers may see peers' bids. Suppliers may see all for their request.
  const isOwner = bid.farmerId === userId;
  const isSupplier = role === "SUPPLIER" && bid.supplierId === userId;
  if (!isOwner && !isSupplier) {
    throw new AppError(403, "Access denied");
  }
  return bid;
}

// ── Modify a bid (farmer, before deadline only) ───────────────
export async function updateBid(
  bidId: string,
  farmerId: string,
  body: UpdateBidBody
) {
  return prisma.$transaction(async (tx) => {
    const bid = await tx.bid.findUnique({ where: { id: bidId } });
    if (!bid) throw new AppError(404, "Bid not found");
    if (bid.farmerId !== farmerId) throw new AppError(403, "Not your bid");

    if (bid.status === "ACCEPTED") {
      throw new AppError(400, "Bid already accepted, cannot modify");
    }

    const proc = await tx.procurementRequest.findUnique({
      where: { id: bid.procurementId },
    });
    if (!proc) throw new AppError(404, "Procurement not found");
    if (new Date() > proc.bidDeadline) {
      throw new AppError(400, "Bid deadline passed, cannot modify or withdraw");
    }

    const grade = body.grade ?? bid.grade;
    if (gradeRank(grade) < gradeRank(proc.minGrade)) {
      throw new AppError(400, `Bid grade must be at least ${proc.minGrade}`);
    }

    const updated = await tx.bid.update({
      where: { id: bidId },
      data: {
        quantityKg: body.quantityKg ?? bid.quantityKg,
        pricePerKg: body.pricePerKg ?? bid.pricePerKg,
        grade,
        gradeRank: toGradeRank(grade),
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : bid.deliveryDate,
        note: body.note !== undefined ? body.note : bid.note,
        status: "ACTIVE",
      },
    });

    emitToProcurement(proc.id, "bid-updated", { bidId });

    return updated;
  });
}

// ── Withdraw a bid (farmer, before deadline only) ─────────────
export async function withdrawBid(bidId: string, farmerId: string) {
  return prisma.$transaction(async (tx) => {
    const bid = await tx.bid.findUnique({ where: { id: bidId } });
    if (!bid) throw new AppError(404, "Bid not found");
    if (bid.farmerId !== farmerId) throw new AppError(403, "Not your bid");
    if (bid.status === "ACCEPTED") {
      throw new AppError(400, "Cannot withdraw an accepted bid");
    }

    const proc = await tx.procurementRequest.findUnique({
      where: { id: bid.procurementId },
    });
    if (!proc) throw new AppError(404, "Procurement not found");
    if (new Date() > proc.bidDeadline) {
      throw new AppError(400, "Bid deadline passed, cannot withdraw");
    }

    const updated = await tx.bid.update({
      where: { id: bidId },
      data: { status: "WITHDRAWN" },
    });

    emitToProcurement(proc.id, "bid-withdrawn", { bidId });

    return updated;
  });
}

// ── Expire stale bids (deadline passed, still active) ─────────
export async function expireOverdueBids(): Promise<number> {
  const now = new Date();
  const expiredProcurements = await prisma.procurementRequest.findMany({
    where: { bidDeadline: { lt: now }, status: "OPEN" },
    select: { id: true },
  });
  if (expiredProcurements.length === 0) return 0;

  const res = await prisma.bid.updateMany({
    where: {
      procurementId: { in: expiredProcurements.map((p) => p.id) },
      status: { in: ["SUBMITTED", "ACTIVE"] },
      // bid delivery window has also lapsed
    },
    data: { status: "EXPIRED" },
  });

  // roll over open procurements once deadline passes
  await prisma.procurementRequest.updateMany({
    where: { id: { in: expiredProcurements.map((p) => p.id) } },
    data: { status: "BIDDING_CLOSED" },
  });

  return res.count;
}
