
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../../config/env";
import { prisma } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import {
  createNotification,
  logActivity,
} from "../../utils/notification.service";

// Initialize Razorpay only when a payment operation needs it.
// This allows the backend to start without payment credentials.
function getRazorpayClient(): Razorpay {
  const { keyId, keySecret } = env.razorpay;

  if (!keyId || !keySecret) {
    throw new AppError(
      503,
      "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env."
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

// 1. Create Razorpay order
export async function createPaymentOrder(
  customerId: string,
  internalOrderId: string
) {
  const rzp = getRazorpayClient();

  const order = await prisma.customerOrder.findUnique({
    where: { id: internalOrderId },
  });

  if (!order) {
    throw new AppError(404, "Order not found");
  }

  if (order.customerId !== customerId) {
    throw new AppError(403, "Not your order");
  }

  if (order.status !== "PAYMENT_PENDING") {
    throw new AppError(
      400,
      `Order is not awaiting payment (status: ${order.status})`
    );
  }

  const amountPaisa = Math.round(order.total * 100);

  const rzpOrder = await rzp.orders.create({
    amount: amountPaisa,
    currency: "INR",
    receipt: internalOrderId,
    notes: { internalOrderId },
  });

  // Create or update the payment record.
  let payment = await prisma.payment.findUnique({
    where: { orderId: internalOrderId },
  });

  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        orderId: internalOrderId,
        amount: order.total,
        paymentMethod: "RAZORPAY",
        status: "CREATED",
        razorpayOrderId: rzpOrder.id,
      },
    });
  } else {
    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: { razorpayOrderId: rzpOrder.id },
    });
  }

  return {
    razorpayOrderId: rzpOrder.id,
    amountPaisa,
    currency: "INR",
    keyId: env.razorpay.keyId,
    orderId: internalOrderId,
  };
}

// 2. Verify payment status with Razorpay
export async function verifyPayment(internalOrderId: string, customerId: string) {
  const rzp = getRazorpayClient();

  const payment = await prisma.payment.findUnique({
    where: { orderId: internalOrderId },
    include: { order: { select: { customerId: true } } },
  });

  if (!payment || !payment.razorpayOrderId) {
    throw new AppError(404, "Payment not initialized");
  }
  if (payment.order?.customerId !== customerId) {
    throw new AppError(403, "Not your order");
  }

  const rzpOrder = await rzp.orders.fetch(payment.razorpayOrderId);
  const status = (rzpOrder as { status?: string }).status ?? "";

  return {
    status,
    razorpayOrderId: payment.razorpayOrderId,
  };
}

// 3. Webhook signature verification middleware
export function verifyWebhookSignature(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const secret = env.razorpay.webhookSecret;

  if (!secret) {
    return next(new AppError(503, "Webhook secret not configured"));
  }

  const signature = req.headers["x-razorpay-signature"] as
    | string
    | undefined;

  // Razorpay signs the exact raw request bytes. Re-serializing req.body can
  // change key order/whitespace and would reject valid signatures.
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const body = rawBody ?? Buffer.from(JSON.stringify(req.body));

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  try {
    const expectedBuffer = Buffer.from(expected, "hex");
    const signatureBuffer = Buffer.from(signature ?? "", "hex");

    const valid =
      expectedBuffer.length === signatureBuffer.length &&
      signatureBuffer.length > 0 &&
      crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

    if (!valid) {
      return next(new AppError(400, "Invalid webhook signature"));
    }

    return next();
  } catch {
    return next(new AppError(400, "Invalid webhook signature"));
  }
}

// 4. Idempotent webhook processing
// Duplicate webhook retries must not create duplicate payments or orders.
export async function processWebhook(payload: {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
      };
    };
  };
}) {
  const event = payload.event;

  if (event !== "payment.captured" && event !== "payment.authorized") {
    return { ignored: true };
  }

  const entity = payload.payload?.payment?.entity;
  const razorpayPaymentId = entity?.id;
  const razorpayOrderId = entity?.order_id;

  if (!razorpayPaymentId || !razorpayOrderId) {
    return { ignored: true };
  }

  let processed = false;

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { razorpayOrderId },
      include: {
        order: {
          include: { items: true },
        },
      },
    });

    if (!payment || !payment.order) {
      throw new AppError(404, "Payment/order not found");
    }

    // The payment id must belong to this order; never let one captured
    // payment id be attached to another order.
    const conflicting = await tx.payment.findFirst({
      where: { razorpayPaymentId },
      select: { id: true, orderId: true },
    });
    if (conflicting && conflicting.orderId !== payment.orderId) {
      throw new AppError(400, "Payment does not belong to this order");
    }

    // Idempotency: duplicate webhook retries must not decrement stock twice.
    if (payment.status === "CAPTURED") {
      return;
    }

    if (
      typeof entity?.amount === "number" &&
      Math.round(payment.amount * 100) !== entity.amount
    ) {
      throw new AppError(400, "Payment amount does not match the order total");
    }

    // Claim the payment atomically. A concurrent retry will update 0 rows and
    // is treated as already processed.
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "CAPTURED" } },
      data: {
        status: "CAPTURED",
        razorpayPaymentId,
      },
    });
    if (claimed.count === 0) {
      return;
    }

    // Confirm the customer order.
    await tx.customerOrder.update({
      where: { id: payment.orderId! },
      data: { status: "CONFIRMED" },
    });

    // Commit inventory reservations after successful payment.
    for (const item of payment.order.items) {
      if (!item.listingId) {
        continue;
      }

      const listing = await tx.productListing.findUnique({
        where: { id: item.listingId },
        include: { inventory: true },
      });

      if (listing) {
        const remainingQuantity =
          listing.inventory.quantityKg - item.quantityKg;
        const reservedToRelease = Math.min(
          item.quantityKg,
          listing.inventory.reservedKg
        );
        const remainingReserved =
          listing.inventory.reservedKg - reservedToRelease;

        await tx.inventoryItem.update({
          where: { id: listing.inventoryId },
          data: {
            quantityKg: { decrement: item.quantityKg },
            reservedKg: { decrement: reservedToRelease },
            status:
              remainingQuantity <= 0
                ? "SOLD_OUT"
                : remainingReserved > 0
                  ? "RESERVED"
                  : "AVAILABLE",
          },
        });

        if (remainingQuantity <= 0) {
          await tx.productListing.update({
            where: { id: listing.id },
            data: { isActive: false },
          });
        }
      }
    }

    await tx.delivery.create({
      data: {
        orderId: payment.orderId!,
        status: "CONFIRMED",
      },
    });

    processed = true;
  });

  if (!processed) {
    return { alreadyProcessed: true };
  }

  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId },
  });

  const order = payment?.orderId
    ? await prisma.customerOrder.findUnique({
        where: { id: payment.orderId },
      })
    : null;

  if (order) {
    await createNotification({
      userId: order.customerId,
      type: "payment_confirmed",
      title: "Payment received",
      body: `Your order ${order.orderNumber} is confirmed`,
      data: { orderId: order.id },
    });
  }

  await logActivity({
    type: "payment_confirmed",
    entityType: "payment",
    entityId: razorpayOrderId,
    data: { razorpayPaymentId },
  });

  return { processed: true };
}

// 5. Farmer payout (supplier pays farmer via Razorpay or offline).
export async function recordFarmerPayout(params: {
  contractId: string;
  supplierId: string;
  amount: number;
  method: "RAZORPAY" | "OFFLINE_CASH" | "MANUAL";
  razorpayTransferId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const contract = await tx.farmerContract.findUnique({
      where: { id: params.contractId },
    });

    if (!contract) {
      throw new AppError(404, "Contract not found");
    }

    if (contract.supplierId !== params.supplierId) {
      throw new AppError(403, "Not your contract");
    }

    const payment = await tx.payment.create({
      data: {
        amount: params.amount,
        paymentMethod: params.method,
        status: "CAPTURED",
        contractId: contract.id,
        metadata: params.razorpayTransferId
          ? { razorpayTransferId: params.razorpayTransferId }
          : undefined,
      },
    });

    await tx.farmerContract.update({
      where: { id: contract.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    await createNotification({
      userId: contract.farmerId,
      type: "farmer_paid",
      title: "Payment received",
      body: `₹${params.amount} paid for your contract`,
      data: {
        contractId: contract.id,
        method: params.method,
      },
    });

    return payment;
  });
}
