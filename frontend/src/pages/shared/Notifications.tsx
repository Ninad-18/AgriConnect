import { useEffect, useState } from "react";
import { fetchNotifications, markAllRead, markRead } from "@/services/notifications";
import type { Notification } from "@/types";
import { timeAgo } from "@/lib/format";
import { Spinner, EmptyState } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { classNames } from "@/lib/format";

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetchNotifications()
      .then(setItems)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const onRead = async (id: string) => {
    await markRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const onReadAll = async () => {
    await markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Notifications"
        actions={
          items.some((n) => !n.read) ? (
            <button className="btn-secondary !py-1.5" onClick={onReadAll}>Mark all read</button>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <EmptyState title="No notifications" hint="Bid updates, contract news and order alerts appear here." />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read && onRead(n.id)}
              className={classNames(
                "card w-full text-left transition",
                !n.read && "border-forest/30 bg-white ring-1 ring-forest/10"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-forest">{n.title}</span>
                <span className="whitespace-nowrap text-xs text-stone-400">{timeAgo(n.createdAt)}</span>
              </div>
              {n.body && <p className="mt-1 text-sm text-stone-500">{n.body}</p>}
              {!n.read && <span className="badge mt-2 bg-forest text-white">New</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}