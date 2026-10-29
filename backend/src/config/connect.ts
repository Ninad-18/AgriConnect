import mongoose from "mongoose";
import { env } from "./env";
import { prisma } from "./database";

export async function connectDatabases(retries = 5, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await Promise.all([
        prisma.$connect(),
        mongoose.connect(env.mongoUrl),
      ]);
      console.log("[db] PostgreSQL and MongoDB connected");
      return;
    } catch (err) {
      if (attempt < retries) {
        console.warn(
          `[db] Database connection attempt ${attempt}/${retries} failed. Retrying in ${delayMs}ms...`
        );
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.error("[db] Failed to connect to databases after max retries", err);
        throw err;
      }
    }
  }
}

export async function disconnectDatabases(): Promise<void> {
  await Promise.all([
    prisma.$disconnect(),
    mongoose.disconnect(),
  ]);
}
