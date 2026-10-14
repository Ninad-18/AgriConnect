import mongoose from "mongoose";
import { env } from "./env";
import { prisma } from "./database";

export async function connectDatabases(): Promise<void> {
  try {
    await Promise.all([
      prisma.$connect(),
      mongoose.connect(env.mongoUrl),
    ]);
    console.log("[db] PostgreSQL and MongoDB connected");
  } catch (err) {
    console.error("[db] Failed to connect to databases", err);
    throw err;
  }
}

export async function disconnectDatabases(): Promise<void> {
  await Promise.all([
    prisma.$disconnect(),
    mongoose.disconnect(),
  ]);
}
