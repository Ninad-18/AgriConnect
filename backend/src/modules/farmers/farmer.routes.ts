import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware";
import { upsertFarmerProfileSchema } from "./farmer.validation";
import * as farmerService from "./farmer.service";

const router = Router();

// `/me` is the canonical route used by the frontend. Keep `/profile` as a
// backwards-compatible alias for existing clients.
router.get(
  ["/me", "/profile"],
  authenticate,
  authorize("FARMER"),
  asyncHandler(async (req, res) => {
    const profile = await farmerService.getFarmerProfile(req.user!.id);
    res.json({ success: true, data: profile });
  })
);

router.put(
  ["/me", "/profile"],
  authenticate,
  authorize("FARMER"),
  validate(upsertFarmerProfileSchema),
  asyncHandler(async (req, res) => {
    const profile = await farmerService.upsertFarmerProfile(req.user!.id, req.body);
    res.json({ success: true, data: profile });
  })
);

export default router;
