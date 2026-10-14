import { Request, Response } from "express";
import * as allocationService from "./allocation.service";

export async function recommendations(req: Request, res: Response): Promise<void> {
  const result = await allocationService.getRecommendations(
    req.params.procurementId,
    req.user!.id
  );
  res.status(200).json({ success: true, data: result });
}

export async function allocate(req: Request, res: Response): Promise<void> {
  const result = await allocationService.getRecommendations(
    req.params.procurementId,
    req.user!.id
  );
  res.status(200).json({ success: true, data: result });
}
