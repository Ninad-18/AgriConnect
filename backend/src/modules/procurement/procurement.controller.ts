import { Request, Response } from "express";
import * as procurementService from "./procurement.service";

export async function createProcurement(req: Request, res: Response): Promise<void> {
  const result = await procurementService.createProcurement(req.user!.id, req.body);
  res.status(201).json({ success: true, data: result });
}

export async function listProcurements(req: Request, res: Response): Promise<void> {
  const mine = req.query.mine === "true";
  const status = req.query.status as string | undefined;
  const result = await procurementService.listProcurements({
    mine,
    status,
    userId: req.user!.id,
    role: req.user!.role,
  });
  res.status(200).json({ success: true, data: result });
}

export async function getProcurement(req: Request, res: Response): Promise<void> {
  const result = await procurementService.getProcurement(
    req.params.procurementId,
    req.user!.id
  );
  res.status(200).json({ success: true, data: result });
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const result = await procurementService.updateStatus(
    req.params.procurementId,
    req.user!.id,
    req.body.status
  );
  res.status(200).json({ success: true, data: result });
}

export async function acceptBids(req: Request, res: Response): Promise<void> {
  const result = await procurementService.acceptBids(
    req.params.procurementId,
    req.user!.id,
    req.body
  );
  res.status(200).json({ success: true, data: result });
}
