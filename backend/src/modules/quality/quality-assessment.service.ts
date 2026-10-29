import { AiAnalysis } from "../../config/mongodb.models";
import { env } from "../../config/env";

type StoredImage = { url: string; buffer: Buffer; mimeType: string };

export async function assessBidImages(params: { bidId: string; cropName: string; images: StoredImage[] }) {
  if (!params.images.length) return [];
  const results = [];
  for (const image of params.images) {
    // Every freshly created bid/image pair is assessed once. Since a bid ID is
    // immutable, retrying this function safely reuses the stored result.
    const prior = await AiAnalysis.findOne({ kind: "quality-assessment", refId: params.bidId, "input.imageUrl": image.url }).lean();
    if (prior) { results.push(prior); continue; }
    const assessment = await requestAssessment(params.cropName, image);
    const saved = await AiAnalysis.create({
      kind: "quality-assessment",
      refId: params.bidId,
      input: { imageUrl: image.url, cropName: params.cropName },
      output: assessment,
      model: assessment.modelVersion ?? "unavailable",
      confidence: typeof (assessment.classification as { confidence?: unknown } | undefined)?.confidence === "number"
        ? (assessment.classification as { confidence: number }).confidence
        : undefined,
    });
    results.push(saved.toObject());
  }
  return results;
}

async function requestAssessment(cropName: string, image: StoredImage) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.qualityService.timeoutMs);
  try {
    const form = new FormData();
    form.append("crop_name", cropName);
    form.append("image", new Blob([image.buffer], { type: image.mimeType }), "crop-image");
    const response = await fetch(`${env.qualityService.url.replace(/\/$/, "")}/api/v1/quality/assess`, {
      method: "POST",
      body: form,
      signal: controller.signal,
      headers: env.qualityService.internalToken ? { Authorization: `Bearer ${env.qualityService.internalToken}` } : {},
    });
    if (!response.ok) throw new Error(`quality service responded ${response.status}`);
    return await response.json() as Record<string, unknown>;
  } catch (error) {
    // Fail open: the submitted bid remains valid and the persisted record is
    // explicit about the unavailable assessment rather than inventing output.
    return {
      capabilityStatus: "SERVICE_UNAVAILABLE",
      modelVersion: "unavailable",
      classification: null,
      defects: [],
      gradeEstimate: null,
      warnings: ["AI visual assessment is currently unavailable."],
      reason: error instanceof Error && error.name === "AbortError" ? "SERVICE_TIMEOUT" : "SERVICE_UNAVAILABLE",
    };
  } finally { clearTimeout(timeout); }
}

export async function getBidAssessments(bidIds: string[]) {
  if (!bidIds.length) return new Map<string, unknown[]>();
  let records: Array<{ refId?: string | null; [key: string]: unknown }> = [];
  try {
    records = await AiAnalysis.find({ kind: "quality-assessment", refId: { $in: bidIds } }).sort({ createdAt: -1 }).lean();
  } catch (error) {
    console.error("[quality] assessment lookup failed", error instanceof Error ? error.message : error);
    return new Map<string, unknown[]>();
  }
  const byBid = new Map<string, unknown[]>();
  for (const record of records) {
    const entries = byBid.get(record.refId ?? "") ?? [];
    entries.push(record); byBid.set(record.refId ?? "", entries);
  }
  return byBid;
}
