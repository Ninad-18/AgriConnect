import multer from "multer";
import { AppError } from "./errorHandler";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new AppError(400, `Unsupported image type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

export const uploadImages = upload.array("images", 10);
export const uploadSingle = upload.single("image");
