import { prisma } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";

export async function getOrCreateCart(customerId: string) {
  const customer = await prisma.customerProfile.findUnique({ where: { userId: customerId } });
  if (!customer) throw new AppError(404, "Customer profile not found");
  let cart = await prisma.cart.findUnique({
    where: { customerId: customer.id },
    include: { items: { include: { listing: true } } },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { customerId: customer.id },
      include: { items: { include: { listing: true } } },
    });
  }
  return cart;
}

export async function addToCart(customerId: string, listingId: string, quantityKg: number) {
  const customer = await prisma.customerProfile.findUnique({ where: { userId: customerId } });
  if (!customer) throw new AppError(404, "Customer profile not found");

  const listing = await prisma.productListing.findUnique({ where: { id: listingId } });
  if (!listing || !listing.isActive) throw new AppError(404, "Product listing not found");

  await getOrCreateCart(customerId);
  const cart = await prisma.cart.findUniqueOrThrow({ where: { customerId: customer.id } });

  // Concurrency-safe inventory reservation happens at checkout; here just store intent.
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_listingId: { cartId: cart.id, listingId } },
  });
  if (existing) {
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantityKg: existing.quantityKg + quantityKg },
    });
  }
  return prisma.cartItem.create({
    data: { cartId: cart.id, listingId, quantityKg, unitPrice: listing.pricePerKg },
  });
}

export async function updateCartItem(cartItemId: string, customerId: string, quantityKg: number) {
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
    return tx.cartItem.update({ where: { id: cartItemId }, data: { quantityKg } });
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
