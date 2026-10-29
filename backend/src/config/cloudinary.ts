import { v2 as cloudinary } from "cloudinary";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "./env";
import { AppError } from "../middleware/errorHandler";

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

export { cloudinary };

export interface UploadResult {
  url: string;
  publicId: string;
}

const LOCAL_UPLOAD_DIRECTORY = path.resolve(process.cwd(), "uploads");
const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

async function saveLocally(buffer: Buffer, mimeType?: string): Promise<UploadResult> {
  const extension = extensionByMimeType[mimeType ?? ""];
  if (!extension) throw new AppError(400, "Unsupported image type");
  await mkdir(LOCAL_UPLOAD_DIRECTORY, { recursive: true });
  const fileName = `${randomUUID()}.${extension}`;
  const destination = path.join(LOCAL_UPLOAD_DIRECTORY, fileName);
  const temporary = `${destination}.uploading`;
  try {
    await writeFile(temporary, buffer, { flag: "wx" });
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    console.error("[upload] local image storage failed", error instanceof Error ? error.message : error);
    throw new AppError(500, "Could not save the uploaded image. Please try again.");
  }
  return {
    url: `http://localhost:${env.port}/uploads/${fileName}`,
    publicId: `local:${fileName}`,
  };
}

export async function uploadImage(
  buffer: Buffer,
  options: { folder?: string; publicId?: string; mimeType?: string } = {}
): Promise<UploadResult> {
  // Local disk storage keeps development usable without credentials. When
  // Cloudinary is configured, production behavior remains unchanged.
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    return saveLocally(buffer, options.mimeType);
  }
  const folder = options.folder ?? env.cloudinary.folder;
  try {
    const mimeType = options.mimeType || "application/octet-stream";
    const result = await cloudinary.uploader.upload(
      `data:${mimeType};base64,${buffer.toString("base64")}`,
      { folder, public_id: options.publicId }
    );
    if (!result.secure_url || !result.public_id) {
      throw new Error("Storage provider returned an incomplete image result");
    }
    return { url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    console.error("[upload] image storage failed", error instanceof Error ? error.message : error);
    throw new AppError(502, "Image upload failed. Please try again with a supported image.");
  }
}

export async function deleteImage(publicId: string): Promise<void> {
  try {
    if (publicId.startsWith("local:")) {
      const fileName = path.basename(publicId.slice("local:".length));
      await unlink(path.join(LOCAL_UPLOAD_DIRECTORY, fileName));
      return;
    }
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // non-critical
  }
}
