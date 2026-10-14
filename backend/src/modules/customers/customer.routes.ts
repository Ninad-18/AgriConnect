import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware";
import { upsertCustomerProfileSchema, addressSchema, cartItemSchema } from "./customer.validation";
import { prisma } from "../../config/database";
import { getOrCreateCart, addToCart, updateCartItem, removeCartItem } from "./customer.service";

const router = Router();

router.get(
  "/profile",
  authenticate,
  authorize("CUSTOMER"),
  asyncHandler(async (req, res) => {
    const profile = await prisma.customerProfile.findUnique({ where: { userId: req.user!.id } });
    res.json({ success: true, data: profile });
  })
);

router.put(
  "/profile",
  authenticate,
  authorize("CUSTOMER"),
  validate(upsertCustomerProfileSchema),
  asyncHandler(async (req, res) => {
    const profile = await prisma.customerProfile.upsert({
      where: { userId: req.user!.id },
      update: req.body,
      create: { userId: req.user!.id, ...req.body },
    });
    res.json({ success: true, data: profile });
  })
);

// Addresses
router.get(
  "/addresses",
  authenticate,
  authorize("CUSTOMER"),
  asyncHandler(async (req, res) => {
    const customer = await prisma.customerProfile.findUnique({
      where: { userId: req.user!.id },
      include: { addresses: true },
    });
    res.json({ success: true, data: customer?.addresses ?? [] });
  })
);

router.post(
  "/addresses",
  authenticate,
  authorize("CUSTOMER"),
  validate(addressSchema),
  asyncHandler(async (req, res) => {
    const customer = await prisma.customerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!customer) throw new Error("Customer profile not found");
    const address = await prisma.address.create({
      data: { customerId: customer.id, ...req.body },
    });
    if (req.body.isDefault) {
      await prisma.address.updateMany({
        where: { customerId: customer.id, id: { not: address.id } },
        data: { isDefault: false },
      });
    }
    res.status(201).json({ success: true, data: address });
  })
);

// Cart
router.get(
  "/cart",
  authenticate,
  authorize("CUSTOMER"),
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user!.id);
    res.json({ success: true, data: cart });
  })
);

router.post(
  "/cart/items",
  authenticate,
  authorize("CUSTOMER"),
  validate(cartItemSchema),
  asyncHandler(async (req, res) => {
    const { listingId, quantityKg } = req.body;
    const result = await addToCart(req.user!.id, listingId, quantityKg);
    res.status(201).json({ success: true, data: result });
  })
);

router.put(
  "/cart/items/:cartItemId",
  authenticate,
  authorize("CUSTOMER"),
  asyncHandler(async (req, res) => {
    const result = await updateCartItem(
      req.params.cartItemId,
      req.user!.id,
      req.body.quantityKg
    );
    res.json({ success: true, data: result });
  })
);

router.delete(
  "/cart/items/:cartItemId",
  authenticate,
  authorize("CUSTOMER"),
  asyncHandler(async (req, res) => {
    await removeCartItem(req.params.cartItemId, req.user!.id);
    const cart = await getOrCreateCart(req.user!.id);
    res.json({ success: true, data: cart });
  })
);

export default router;
