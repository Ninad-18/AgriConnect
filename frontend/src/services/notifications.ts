import { api } from "@/services/api";
import type { Notification } from "@/types";

export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await api.get("/notifications");
  return data.data ?? [];
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get("/notifications/unread-count");
  return (data.data as { count: number })?.count ?? 0;
}

export async function markAllRead(): Promise<void> {
  await api.post("/notifications/read");
}

export async function markRead(id: string): Promise<void> {
  await api.post(`/notifications/read/${id}`);
}