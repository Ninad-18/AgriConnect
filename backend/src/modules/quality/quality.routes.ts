import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware";
import { z } from "zod";
import { verifyQualitySchema } from "./quality.validation";
import * as qualityService from "./quality.service";

const router = Router();

const receiveSchema = z.object({
  body: z.object({ receivedQuantityKg: z.number().positive().optional() }),
});

router.post(
  "/contracts/:contractId/receive",
  authenticate,
  authorize("SUPPLIER"),
  validate(receiveSchema),
  asyncHandler(async (req, res) => {
    const result = await qualityService.receiveProduce(
      req.params.contractId,
      req.user!.id,
      req.body.receivedQuantityKg
    );
    res.json({ success: true, data: result });
  })
);

router.post(
  "/verify",
  authenticate,
  authorize("SUPPLIER"),
  validate(verifyQualitySchema),
  asyncHandler(async (req, res) => {
    const result = await qualityService.verifyQuality(
      req.body.contractId,
      req.user!.id,
      req.body
    );
    res.json({ success: true, data: result });
  })
);

export default router;
