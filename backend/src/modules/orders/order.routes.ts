import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import * as orderService from "./order.service";

const router = Router();

const createOrderSchema = z.object({
  body: z.object({
    addressId: z.string().min(1),
  }),
});

// Customer: list own orders
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const orders = await orderService.listOrders(req.user!.id, req.user!.role);
    res.json({ success: true, data: orders });
  })
);

router.get(
  "/:orderId",
  authenticate,
  asyncHandler(async (req, res) => {
    const order = await orderService.getOrder(req.params.orderId, req.user!.id, req.user!.role);
    res.json({ success: true, data: order });
  })
);

// Checkout: create order in PAYMENT_PENDING, returns order + razorpay payload
router.post(
  "/",
  authenticate,
  authorize("CUSTOMER"),
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const result = await orderService.checkout(req.user!.id, req.body.addressId);
    res.status(201).json({ success: true, data: result });
  })
);

// Advance order status (seller side: PROCESSING->PACKED->SHIPPED->OUT_FOR_DELIVERY)
router.post(
  "/:orderId/advance",
  authenticate,
  authorize("FARMER", "SUPPLIER"),
  asyncHandler(async (req, res) => {
    const result = await orderService.advanceStatus(req.params.orderId, req.user!.id);
    res.json({ success: true, data: { status: result } });
  })
);

export default router;
