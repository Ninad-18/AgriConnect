import bcrypt from "bcrypt";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { AppError } from "../../middleware/errorHandler";
import { Role } from "../../utils/constants";
import { signToken } from "../../middleware/auth";
import { logActivity } from "../../utils/notification.service";
import type { RegisterBody, LoginBody } from "./auth.validation";

export async function register(body: RegisterBody) {
  const email = body.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(400, "Email already registered");
  }

  const passwordHash = await bcrypt.hash(body.password, env.bcryptRounds);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: body.name,
      role: body.role as Role,
      phone: body.phone,
      location: body.location,
      farmerProfile: body.role === Role.FARMER ? { create: {} } : undefined,
      supplierProfile: body.role === Role.SUPPLIER ? { create: {} } : undefined,
      customerProfile: body.role === Role.CUSTOMER ? { create: {} } : undefined,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      location: true,
      createdAt: true,
    },
  });

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  await logActivity({
    actorId: user.id,
    actorRole: user.role,
    type: "user_registered",
    entityType: "user",
    entityId: user.id,
  });

  return { token, user };
}

export async function login(body: LoginBody) {
  const email = body.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role as Role });

  await logActivity({
    actorId: user.id,
    actorRole: user.role,
    type: "user_login",
    entityType: "user",
    entityId: user.id,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      location: user.location,
    },
  };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      location: true,
      createdAt: true,
      farmerProfile: true,
      supplierProfile: true,
      customerProfile: true,
    },
  });
  if (!user) throw new AppError(404, "User not found");
  return user;
}
