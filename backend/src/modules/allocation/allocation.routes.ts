import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware";
import * as allocationController from "./allocation.controller";

const router = Router();

router.get(
  "/:procurementId/recommendations",
  authenticate,
  authorize("SUPPLIER"),
  asyncHandler(allocationController.recommendations)
);

router.post(
  "/:procurementId/allocate",
  authenticate,
  authorize("SUPPLIER"),
  asyncHandler(allocationController.allocate)
);

export default router;
