import { prisma } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { OrderStatus } from "../../utils/constants";
import { createNotification } from "../../utils/notification.service";
import { emitToUser } from "../../config/socket";

const STATUS_ORDER: OrderStatus[] = [
  "CREATED",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export async function getTracking(orderId: string, userId: string, role: string) {
  const order = await prisma.customerOrder.findUnique({
    where: { id: orderId },
    include: { deliveries: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) throw new AppError(404, "Order not found");
  const allowed = order.customerId === userId || (role !== "CUSTOMER" && order.supplierId === userId);
  if (!allowed) throw new AppError(403, "Access denied");

  const events = (order.deliveries ?? []).map((d) => ({
    stage: d.status,
    at: d.createdAt,
  }));

  return {
    orderId,
    currentStatus: order.status,
    statusProgress: STATUS_ORDER.indexOf(order.status as OrderStatus),
    events,
  };
}

interface TrackEvent {
  status: string;
  at: string;
  location?: string;
}

export async function updateTracking(
  orderId: string,
  sellerId: string,
  status: string,
  location?: string
) {
  const valid = ["PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
  if (!valid.includes(status)) {
    throw new AppError(400, "Invalid tracking status");
  }

  const order = await prisma.customerOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(404, "Order not found");
  if (order.supplierId !== sellerId) throw new AppError(403, "Not your order");

  const latest = await prisma.delivery.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });

  const existingEvents = ((latest?.events as unknown) ?? []) as TrackEvent[];
  const newEvents: TrackEvent[] = [
    ...existingEvents,
    { status, at: new Date().toISOString(), location: location ?? undefined },
  ];

  const delivery = latest
    ? await prisma.delivery.update({
        where: { id: latest.id },
        data: { status, events: newEvents as unknown as object },
      })
    : await prisma.delivery.create({
        data: {
          orderId,
          status,
          trackingNumber: `TR-${Date.now()}`,
          events: newEvents as unknown as object,
        },
      });

  if (status === "DELIVERED") {
    if (order.status !== "DELIVERED") {
      await prisma.customerOrder.update({
        where: { id: orderId },
        data: { status: "DELIVERED" },
      });
      await createNotification({
        userId: order.customerId,
        type: "shipment_status_changed",
        title: "Order delivered",
        body: "Your order has been delivered",
        data: { orderId },
      });
      emitToUser(order.customerId, "tracking", { orderId, status: "DELIVERED" });
    }
  }

  return { delivery };
}