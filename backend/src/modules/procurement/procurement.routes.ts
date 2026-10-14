import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware";
import * as procurementController from "./procurement.controller";
import {
  createProcurementSchema,
  acceptBidsSchema,
  procurementIdSchema,
  updateStatusSchema,
} from "./procurement.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("SUPPLIER"),
  validate(createProcurementSchema),
  asyncHandler(procurementController.createProcurement)
);

router.get("/", authenticate, asyncHandler(procurementController.listProcurements));

router.get(
  "/:procurementId",
  authenticate,
  validate(procurementIdSchema),
  asyncHandler(procurementController.getProcurement)
);

router.patch(
  "/:procurementId/status",
  authenticate,
  authorize("SUPPLIER"),
  validate(procurementIdSchema),
  validate(updateStatusSchema),
  asyncHandler(procurementController.updateStatus)
);

router.post(
  "/:procurementId/accept-bids",
  authenticate,
  authorize("SUPPLIER"),
  validate(procurementIdSchema),
  validate(acceptBidsSchema),
  asyncHandler(procurementController.acceptBids)
);

export default router;
