import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware";
import { z } from "zod";
import * as paymentService from "./payment.service";

const router = Router();

const createOrderSchema = z.object({
  body: z.object({
    orderId: z.string().min(1),
  }),
});

// 1. Backend creates a Razorpay payment order referencing the internal order
router.post(
  "/create-order",
  authenticate,
  authorize("CUSTOMER"),
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const result = await paymentService.createPaymentOrder(req.user!.id, req.body.orderId);
    res.status(201).json({ success: true, data: result });
  })
);

// 2. Client-side confirmation (used only to cross-check; NOT authoritative)
router.post(
  "/verify",
  authenticate,
  authorize("CUSTOMER"),
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const result = await paymentService.verifyPayment(req.body.orderId);
    res.json({ success: true, data: result });
  })
);

// 3. Razorpay webhook (server-verified, idempotent) - NO auth (signed)
router.post(
  "/webhook",
  paymentService.verifyWebhookSignature as never,
  asyncHandler(async (req, res) => {
    await paymentService.processWebhook(req.body);
    res.json({ success: true });
  })
);

export default router;
