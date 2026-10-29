import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware";
import { upsertSupplierProfileSchema } from "./supplier.validation";
import * as supplierService from "./supplier.service";

const router = Router();

router.get(
  ["/me", "/profile"],
  authenticate,
  authorize("SUPPLIER"),
  asyncHandler(async (req, res) => {
    const profile = await supplierService.getSupplierProfile(req.user!.id);
    res.json({ success: true, data: profile });
  })
);

router.put(
  ["/me", "/profile"],
  authenticate,
  authorize("SUPPLIER"),
  validate(upsertSupplierProfileSchema),
  asyncHandler(async (req, res) => {
    const profile = await supplierService.upsertSupplierProfile(req.user!.id, req.body);
    res.json({ success: true, data: profile });
  })
);

router.get(
  "/contracts",
  authenticate,
  authorize("SUPPLIER"),
  asyncHandler(async (req, res) => {
    const result = await supplierService.getContractsGroupedByProcurement(req.user!.id);
    res.json({ success: true, data: result });
  })
);

export default router;
