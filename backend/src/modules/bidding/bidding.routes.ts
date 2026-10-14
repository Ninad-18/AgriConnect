import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware";
import { uploadImages } from "../../middleware/upload";
import * as biddingController from "./bidding.controller";
import {
  createBidSchema,
  updateBidSchema,
  bidIdSchema,
} from "./bidding.validation";

const router = Router();

// Multer must run before body validation so file fields and json coexist.
router.post(
  "/",
  authenticate,
  authorize("FARMER"),
  uploadImages,
  validate(createBidSchema),
  asyncHandler(biddingController.createBid)
);

router.get("/mine", authenticate, authorize("FARMER"), asyncHandler(biddingController.myBids));

router.put(
  "/:bidId",
  authenticate,
  authorize("FARMER"),
  validate(bidIdSchema),
  validate(updateBidSchema),
  asyncHandler(biddingController.updateBid)
);

router.patch(
  "/:bidId/withdraw",
  authenticate,
  authorize("FARMER"),
  validate(bidIdSchema),
  asyncHandler(biddingController.withdrawBid)
);

router.get("/:bidId", authenticate, validate(bidIdSchema), asyncHandler(biddingController.getBid));

export default router;
