import { Router } from "express";
import { asyncHandler } from "../../middleware";
import * as marketPriceService from "./marketPrice.service";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  const prices = await marketPriceService.listPrices();
  res.json({ success: true, data: prices });
}));

router.get("/history/:crop", asyncHandler(async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 30;
  const history = await marketPriceService.getHistory(req.params.crop, days);
  res.json({ success: true, data: history });
}));

router.get("/:crop", asyncHandler(async (req, res) => {
  const price = await marketPriceService.getPrice(req.params.crop, {
    market: req.query.market as string | undefined,
    state: req.query.state as string | undefined,
  });
  res.json({ success: true, data: price });
}));

router.post("/refresh/:crop", asyncHandler(async (req, res) => {
  await marketPriceService.refreshPrice(req.params.crop);
  res.json({ success: true, message: `Cache refreshed for ${req.params.crop}` });
}));

export default router;
