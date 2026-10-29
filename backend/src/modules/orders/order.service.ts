import { prisma } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { generateOrderNumber, round2 } from "../../utils/helpers";
import { logActivity } from "../../utils/notification.service";

// ── Checkout: build order from cart, set PAYMENT_PENDING ─────
// Inventory is RESERVED here (atomic), decremented at payment confirmation.
export async function checkout(customerId: string, addressId: string) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customerProfile.findUnique({
      where: { userId: customerId },
      include: {
        cart: {
          include: {
            items: {
              include: {
                listing: { include: { inventory: true } },
              },
            },
          },
        },
      },
    });
    if (!customer) throw new AppError(404, "Customer profile not found");
    if (!customer.cart || customer.cart.items.length === 0) {
      throw new AppError(400, "Cart is empty");
    }
    const address = await tx.address.findUnique({
      where: { id: addressId, customerId: customer.id },
    });
    if (!address) throw new AppError(404, "Address not found");

    let subtotal = 0;
    const orderItems = [];
    const sellerIds = new Set<string>();
    const reservations: {
      listingId: string;
      inventoryId: string;
      title: string;
      qty: number;
    }[] = [];

    for (const item of customer.cart.items) {
      const listing = item.listing;
      const inventory = listing.inventory;
      if (!listing.isActive) {
        throw new AppError(400, `${listing.title} is no longer available`);
      }
      if (!Number.isFinite(item.quantityKg) || item.quantityKg <= 0) {
        throw new AppError(400, `Invalid quantity for ${listing.title}`);
      }

      // Listing prices are authoritative at checkout; never reuse a price a
      // browser stored in its cart before a seller changed the listing.
      const lineAmount = round2(item.quantityKg * listing.pricePerKg);
      subtotal += lineAmount;
      orderItems.push({
        listingId: item.listingId,
        title: listing.title,
        quantityKg: item.quantityKg,
        unitPrice: listing.pricePerKg,
        amount: lineAmount,
      });
      sellerIds.add(listing.supplierId);
      reservations.push({
        listingId: item.listingId,
        inventoryId: inventory.id,
        title: listing.title,
        qty: item.quantityKg,
      });
    }

    if (sellerIds.size > 1) {
      // Multi-seller order is out of scope for MVP; require a single-seller cart.
      throw new AppError(400, "Checkout currently supports a single seller per order");
    }

    // Concurrency-safe reservation. The conditional UPDATE guarantees two
    // simultaneous checkouts cannot both reserve the same stock.
    for (const reservation of reservations) {
      const updated = await tx.$executeRaw`
        UPDATE "InventoryItem"
        SET "reservedKg" = "reservedKg" + ${reservation.qty},
            "status" = 'RESERVED'::"InventoryStatus",
            "updatedAt" = NOW()
        WHERE "id" = ${reservation.inventoryId}
          AND "quantityKg" - "reservedKg" >= ${reservation.qty}
          AND "status" <> 'SOLD_OUT'::"InventoryStatus"
      `;
      if (updated !== 1) {
        throw new AppError(
          409,
          `Insufficient inventory for ${reservation.title}. Please update your cart.`
        );
      }
    }

    const deliveryFee = 0;
    const total = round2(subtotal + deliveryFee);

    const order = await tx.customerOrder.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        supplierId: [...sellerIds][0],
        addressId: address.id,
        subtotal: round2(subtotal),
        deliveryFee,
        total,
        status: "PAYMENT_PENDING",
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // Mark cart checked out
    await tx.cart.update({
      where: { id: customer.cart.id },
      data: { status: "CHECKED_OUT" },
    });

    await logActivity({
      actorId: customerId,
      actorRole: "CUSTOMER",
      type: "order_created",
      entityType: "customerOrder",
      entityId: order.id,
      data: { total },
    });

    return { order };
  });
}

export async function listOrders(userId: string, role: string) {
  const where: Record<string, unknown> = {};
  if (role === "CUSTOMER") where.customerId = userId;
  else where.supplierId = userId;
  return prisma.customerOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: true, payment: true, deliveries: true },
  });
}

export async function getOrder(orderId: string, userId: string, role: string) {
  const order = await prisma.customerOrder.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true, address: true, deliveries: true },
  });
  if (!order) throw new AppError(404, "Order not found");
  const allowed =
    order.customerId === userId ||
    (role !== "CUSTOMER" && order.supplierId === userId);
  if (!allowed) throw new AppError(403, "Access denied");
  return order;
}

// ── Advance seller-side status ───────────────────────────────
const SELLER_FLOW: Record<string, string> = {
  CONFIRMED: "PROCESSING",
  PROCESSING: "PACKED",
  PACKED: "SHIPPED",
  SHIPPED: "OUT_FOR_DELIVERY",
  // DELIVERED is set by tracking module (customer/delivery confirmation)
};

export async function advanceStatus(orderId: string, sellerId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(404, "Order not found");
    if (order.supplierId !== sellerId) throw new AppError(403, "Not your order");
    const next = SELLER_FLOW[order.status];
    if (!next) throw new AppError(400, `Order cannot advance from ${order.status}`);
    const updated = await tx.customerOrder.update({
      where: { id: orderId },
      data: { status: next as never },
    });

    if (next === "SHIPPED") {
      await tx.delivery.create({ data: { orderId, status: "SHIPPED" } });
    }
    return updated.status;
  });
}
