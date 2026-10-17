
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
export async function verifyPayment(internalOrderId: string) {
  const rzp = getRazorpayClient();

  const payment = await prisma.payment.findUnique({
    where: { orderId: internalOrderId },
  });

  if (!payment || !payment.razorpayOrderId) {
    throw new AppError(404, "Payment not initialized");
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

  const body = JSON.stringify(req.body);

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

  await prisma.$transaction(async (tx) => {
    // Idempotency: don't process an already captured payment again.
    const existing = await tx.payment.findFirst({
      where: { razorpayPaymentId },
    });

    if (existing && existing.status === "CAPTURED") {
      return { alreadyProcessed: true };
    }

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

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "CAPTURED",
        razorpayPaymentId,
      },
    });

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

        await tx.inventoryItem.update({
          where: { id: listing.inventoryId },
          data: {
            quantityKg: { decrement: item.quantityKg },
            reservedKg: { decrement: item.quantityKg },
            status:
              remainingQuantity <= 0 ? "SOLD_OUT" : "AVAILABLE",
          },
        });
      }
    }

    await tx.delivery.create({
      data: {
        orderId: payment.orderId!,
        status: "CONFIRMED",
      },
    });
  });

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
