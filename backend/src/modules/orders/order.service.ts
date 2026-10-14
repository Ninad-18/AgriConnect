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
      include: { cart: { include: { items: { include: { listing: { include: { inventory: true } } } } } } },
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
    const supplierIds = new Set<string>();
    let listingIdToInv: { listingId: string; inventoryId: string; qty: number }[] = [];

    // Atomic inventory reservation + order item build
    for (const item of customer.cart.items) {
      const inv = item.listing.inventory;
      const available = inv.quantityKg - inv.reservedKg;
      if (item.quantityKg > available) {
        throw new AppError(400, `Insufficient inventory for ${item.listing.title}`);
      }
      const lineAmount = round2(item.quantityKg * item.unitPrice);
      subtotal += lineAmount;
      orderItems.push({
        listingId: item.listingId,
        title: item.listing.title,
        quantityKg: item.quantityKg,
        unitPrice: item.unitPrice,
        amount: lineAmount,
      });
      supplierIds.add(item.listing.supplierId);
      listingIdToInv.push({ listingId: item.listingId, inventoryId: inv.id, qty: item.quantityKg });
    }

    if (supplierIds.size > 1) {
      // Multi-supplier order is out of scope for MVP; require single-supplier cart.
      throw new AppError(400, "Checkout currently supports a single supplier per order");
    }

    // Reserve inventory (atomic decrement of available)
    for (const li of listingIdToInv) {
      await tx.inventoryItem.update({
        where: { id: li.inventoryId },
        data: { reservedKg: { increment: li.qty }, status: "RESERVED" },
      });
    }

    const shipping = subtotal >= 500 ? 0 : 40;
    const total = round2(subtotal + shipping);

    const order = await tx.customerOrder.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        supplierId: [...supplierIds][0],
        addressId: address.id,
        subtotal: round2(subtotal),
        deliveryFee: shipping,
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
  let where: Record<string, unknown> = {};
  if (role === "CUSTOMER") where.customerId = userId;
  else if (role === "SUPPLIER") where.supplierId = userId;
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
    (role === "SUPPLIER" && order.supplierId === userId);
  if (!allowed) throw new AppError(403, "Access denied");
  return order;
}

// ── Advance supplier-side status ─────────────────────────────
const SUPPLIER_FLOW: Record<string, string> = {
  CONFIRMED: "PROCESSING",
  PROCESSING: "PACKED",
  PACKED: "SHIPPED",
  SHIPPED: "OUT_FOR_DELIVERY",
  // DELIVERED is set by tracking module (customer/delivery confirmation)
};

export async function advanceStatus(orderId: string, supplierId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(404, "Order not found");
    if (order.supplierId !== supplierId) throw new AppError(403, "Not your order");
    const next = SUPPLIER_FLOW[order.status];
    if (!next) throw new AppError(400, `Order cannot advance from ${order.status}`);
    const updated = await tx.customerOrder.update({
      where: { id: orderId },
      data: { status: next as never },
    });

    if (next === "SHIPPED") {
      await tx.delivery.create({ data: { orderId, status: "SHIPPED" } });
    }
    return next;
  });
}
