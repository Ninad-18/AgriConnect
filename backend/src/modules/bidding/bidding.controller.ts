import { Request, Response } from "express";
import * as biddingService from "./bidding.service";
import { uploadImage } from "../../config/cloudinary";
import { assessBidImages } from "../quality/quality-assessment.service";
import { prisma } from "../../config/database";

export async function createBid(req: Request, res: Response): Promise<void> {
  // Optional image uploads
  const files = (req.files ?? []) as Express.Multer.File[];
  const uploaded: { url: string; buffer: Buffer; mimeType: string }[] = [];
  for (const file of files) {
    const { url } = await uploadImage(file.buffer, {
      folder: "agriconnect/bids",
      mimeType: file.mimetype,
    });
    uploaded.push({ url, buffer: file.buffer, mimeType: file.mimetype });
  }
  const result = await biddingService.createBid(req.user!.id, req.body, uploaded.map((image) => image.url));
  if (uploaded.length) {
    const procurement = await prisma.procurementRequest.findUnique({
      where: { id: result.procurementId }, include: { product: { select: { cropName: true } } },
    });
    // AI service errors are persisted as an unavailable assessment and never
    // roll back a valid bid or disclose service internals to the frontend.
    try {
      await assessBidImages({ bidId: result.id, cropName: procurement?.product.cropName ?? "unknown", images: uploaded });
    } catch (error) {
      console.error("[quality] could not persist assessment", error instanceof Error ? error.message : error);
    }
  }
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
