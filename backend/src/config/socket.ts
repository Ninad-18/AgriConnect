import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./env";

let io: Server | null = null;

const ROOM_BY_USER = "user:";
const ROOM_BY_PROCUREMENT = "procurement:";

/**
 * Initialize Socket.IO for real-time bidding updates and notifications.
 * The database remains the source of truth; websocket events never replace
 * persistence.
 */
export function initSocket(httpServer: import("http").Server): Server {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Not authenticated"));
    try {
      const payload = jwt.verify(token, env.jwtSecret) as { sub: string; role: string };
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`${ROOM_BY_USER}${userId}`);

    socket.on("join-procurement", (procurementId: string) => {
      socket.join(`${ROOM_BY_PROCUREMENT}${procurementId}`);
    });
    socket.on("leave-procurement", (procurementId: string) => {
      socket.leave(`${ROOM_BY_PROCUREMENT}${procurementId}`);
    });
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  try {
    io?.to(`${ROOM_BY_USER}${userId}`).emit(event, payload);
  } catch {
    // non-critical
  }
}

export function emitToProcurement(procurementId: string, event: string, payload: unknown): void {
  try {
    io?.to(`${ROOM_BY_PROCUREMENT}${procurementId}`).emit(event, payload);
  } catch {
    // non-critical
  }
}
