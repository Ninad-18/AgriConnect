import { Router } from "express";
import { asyncHandler } from "../../middleware";
import * as marketPriceService from "./marketPrice.service";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  const prices = await marketPriceService.listPrices();
  res.json({ success: true, data: prices });
}));

router.get("/:crop", asyncHandler(async (req, res) => {
  const price = await marketPriceService.getPrice(req.params.crop);
  res.json({ success: true, data: price });
}));

router.get("/history/:crop", asyncHandler(async (req, res) => {
  const history = await marketPriceService.getHistory(req.params.crop);
  res.json({ success: true, data: history });
}));

export default router;
