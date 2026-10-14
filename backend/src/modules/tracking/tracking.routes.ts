import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware";
import { prisma } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import * as trackingService from "./tracking.service";

const router = Router();

router.get(
  "/order/:orderId",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await trackingService.getTracking(req.params.orderId, req.user!.id, req.user!.role);
    res.json({ success: true, data: result });
  })
);

// Advance tracking (e.g., supplier marks shipped; delivery updates)
router.post(
  "/order/:orderId/update",
  authenticate,
  authorize("SUPPLIER"),
  asyncHandler(async (req, res) => {
    const result = await trackingService.updateTracking(
      req.params.orderId,
      req.user!.id,
      req.body.status as string,
      req.body.location
    );
    res.json({ success: true, data: result });
  })
);

export default router;