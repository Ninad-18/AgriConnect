import { prisma } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { sellableStock } from "../../utils/helpers";

const cartInclude = {
  items: {
    include: {
      listing: {
        include: {
          inventory: true,
          product: { select: { id: true, name: true, cropName: true } },
        },
      },
    },
  },
} as const;

function assertAvailable(
  listing: { title: string; isActive: boolean; inventory: { quantityKg: number; reservedKg: number } },
  requestedKg: number
) {
  if (!listing.isActive) {
    throw new AppError(400, `${listing.title} is no longer available`);
  }
  const available = sellableStock(listing.inventory);
  if (requestedKg > available) {
    throw new AppError(
      400,
      `Only ${Math.max(0, available)}kg of ${listing.title} is available`
    );
  }
}

// Keep the checkout MVP single-seller: a cart may only contain products from
// one seller. Mixing sellers would create ambiguous order ownership.
async function assertSingleSeller(
  cartId: string,
  sellerId: string,
  ignoreItemId?: string
) {
  const conflicting = await prisma.cartItem.findFirst({
    where: {
      cartId,
      listing: { supplierId: { not: sellerId } },
      ...(ignoreItemId ? { id: { not: ignoreItemId } } : {}),
    },
    include: { listing: { select: { title: true } } },
  });
  if (conflicting) {
    throw new AppError(
      400,
      "Your cart contains products from another seller. Checkout supports one seller per order."
    );
  }
}

export async function getOrCreateCart(customerId: string) {
  const customer = await prisma.customerProfile.findUnique({ where: { userId: customerId } });
  if (!customer) throw new AppError(404, "Customer profile not found");
  let cart = await prisma.cart.findUnique({
    where: { customerId: customer.id },
    include: cartInclude,
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { customerId: customer.id },
      include: cartInclude,
    });
  }
  // Keep display prices aligned with the listing price that checkout will use.
  // The server still recalculates from the listing inside checkout.
  const stalePriceItems = cart.items.filter((item) => item.unitPrice !== item.listing.pricePerKg);
  if (stalePriceItems.length > 0) {
    await prisma.$transaction(
      stalePriceItems.map((item) =>
        prisma.cartItem.update({ where: { id: item.id }, data: { unitPrice: item.listing.pricePerKg } })
      )
    );
    cart = await prisma.cart.findUniqueOrThrow({
      where: { customerId: customer.id },
      include: cartInclude,
    });
  }
  return cart;
}

export async function addToCart(customerId: string, listingId: string, quantityKg: number) {
  if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
    throw new AppError(400, "Quantity must be greater than zero");
  }

  const customer = await prisma.customerProfile.findUnique({ where: { userId: customerId } });
  if (!customer) throw new AppError(404, "Customer profile not found");

  const listing = await prisma.productListing.findUnique({
    where: { id: listingId },
    include: { inventory: true },
  });
  if (!listing || !listing.isActive) throw new AppError(404, "Product listing not found");

  await getOrCreateCart(customerId);
  const cart = await prisma.cart.findUniqueOrThrow({ where: { customerId: customer.id } });

  await assertSingleSeller(cart.id, listing.supplierId);

  // Concurrency-safe inventory reservation happens at checkout; here we only
  // store intent and reject requests that clearly exceed current stock.
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_listingId: { cartId: cart.id, listingId } },
  });
  const requested = (existing?.quantityKg ?? 0) + quantityKg;
  assertAvailable(listing, requested);

  if (existing) {
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantityKg: requested, unitPrice: listing.pricePerKg },
    });
  }
  return prisma.cartItem.create({
    data: { cartId: cart.id, listingId, quantityKg, unitPrice: listing.pricePerKg },
  });
}

export async function updateCartItem(cartItemId: string, customerId: string, quantityKg: number) {
  if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
    throw new AppError(400, "Quantity must be greater than zero");
  }

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customerProfile.findUnique({ where: { userId: customerId } });
    if (!customer) throw new AppError(404, "Customer profile not found");
    const item = await tx.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: { select: { id: true, customerId: true } },
        listing: { include: { inventory: true } },
      },
    });
    if (!item || item.cart.customerId !== customer.id) {
      throw new AppError(404, "Cart item not found");
    }
    assertAvailable(item.listing, quantityKg);
    await assertSingleSeller(item.cart.id, item.listing.supplierId, item.id);
    return tx.cartItem.update({
      where: { id: cartItemId },
      data: { quantityKg, unitPrice: item.listing.pricePerKg },
    });
  });
}

export async function removeCartItem(cartItemId: string, customerId: string) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customerProfile.findUnique({ where: { userId: customerId } });
    if (!customer) throw new AppError(404, "Customer profile not found");
    const item = await tx.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: { select: { customerId: true } } },
    });
    if (!item || item.cart.customerId !== customer.id) {
      throw new AppError(404, "Cart item not found");
    }
    return tx.cartItem.delete({ where: { id: cartItemId } });
  });
}
