import { prisma } from "../config/database";
import { ActivityEvent, NotificationPayload } from "../config/mongodb.models";

interface EventParams {
  actorId?: string;
  actorRole?: string;
  type: string;
  entityType?: string;
  entityId?: string;
  data?: Record<string, unknown>;
}

/**
 * Append a non-authoritative activity/event document to MongoDB.
 * Failures must never roll back the underlying business transaction.
 */
export async function logActivity(params: EventParams): Promise<void> {
  try {
    await ActivityEvent.create(params);
  } catch (err) {
    console.error("[activity] log failed:", (err as Error).message);
  }
}

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  // Durable Postgres notification record
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data as object,
      },
    });
  } catch (err) {
    console.error("[notify] postgres record failed:", (err as Error).message);
  }

  // Notification payload log in Mongo + (future) FCM push
  try {
    await NotificationPayload.create({ ...params, deliveryStatus: "pending" });
  } catch (err) {
    console.error("[notify] mongo payload failed:", (err as Error).message);
  }
}

export async function getNotificationsForUser(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
) {
  const where: { userId: string; read?: boolean } = { userId };
  if (options.unreadOnly) where.read = false;
  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 50,
  });
}

export async function markNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId }, data: { read: true } });
}
