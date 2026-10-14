import { Request, Response } from "express";
import * as biddingService from "./bidding.service";
import { uploadImage } from "../../config/cloudinary";

export async function createBid(req: Request, res: Response): Promise<void> {
  // Optional image uploads
  const files = (req.files ?? []) as Express.Multer.File[];
  const urls: string[] = [];
  for (const file of files) {
    const { url } = await uploadImage(file.buffer, { folder: "agriconnect/bids" });
    urls.push(url);
  }
  const result = await biddingService.createBid(req.user!.id, req.body, urls);
  res.status(201).json({ success: true, data: result });
}

export async function myBids(req: Request, res: Response): Promise<void> {
  const result = await biddingService.myBids(req.user!.id);
  res.status(200).json({ success: true, data: result });
}

export async function getBid(req: Request, res: Response): Promise<void> {
  const result = await biddingService.getBid(req.params.bidId, req.user!.id, req.user!.role);
  res.status(200).json({ success: true, data: result });
}

export async function updateBid(req: Request, res: Response): Promise<void> {
  const result = await biddingService.updateBid(req.params.bidId, req.user!.id, req.body);
  res.status(200).json({ success: true, data: result });
}

export async function withdrawBid(req: Request, res: Response): Promise<void> {
  const result = await biddingService.withdrawBid(req.params.bidId, req.user!.id);
  res.status(200).json({ success: true, data: result });
}
