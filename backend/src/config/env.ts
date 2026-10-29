import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function required(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim()),

  // DB
  databaseUrl: required("DATABASE_URL"),
  mongoUrl: required("MONGO_URL"),
  redisUrl: required("REDIS_URL"),

  // Auth
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
    folder: process.env.CLOUDINARY_FOLDER ?? "agriconnect",
  },

  // Razorpay
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  },

  // Google Maps
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",

  qualityService: {
    url: process.env.QUALITY_SERVICE_URL ?? "http://localhost:8001",
    internalToken: process.env.QUALITY_INTERNAL_TOKEN ?? "",
    timeoutMs: Number(process.env.QUALITY_SERVICE_TIMEOUT_MS ?? 8000),
  },
};

export const isProd = env.nodeEnv === "production";
