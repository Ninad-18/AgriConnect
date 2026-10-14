import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/database";
import { Role } from "@/utils/constants";
import { AppError } from "./errorHandler";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export function signToken(user: { id: string; email: string; role: Role }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] }
  );
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return next(new AppError(401, "Not authenticated"));
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    if (!payload.sub || !payload.role) {
      return next(new AppError(401, "Invalid token"));
    }
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    return next(new AppError(401, "Invalid or expired token"));
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      return next(new AppError(401, "Not authenticated"));
    }
    if (!roles.includes(user.role)) {
      return next(new AppError(403, "Access denied for your role"));
    }
    next();
  };
}

// Load full user row from DB (use when role/identity must be verified fresh)
export async function loadUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    return next(new AppError(401, "Not authenticated"));
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return next(new AppError(401, "User not found"));
  }
  req.user = { id: user.id, email: user.email, role: user.role as Role };
  next();
}
