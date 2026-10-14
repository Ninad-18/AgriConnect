import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchOrders } from "@/services/orders";
import { getErrorMessage } from "@/services/api";
import { api } from "@/services/api";
import type { CustomerOrder } from "@/types";
import { fmtINR, fmtDate } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

const NEXT_STEP: Record<string, { label: string; next: string | null }> = {
  CONFIRMED: { label: "Mark processing", next: "PROCESSING" },
  PROCESSING: { label: "Mark packed", next: "PACKED" },
  PACKED: { label: "Mark shipped", next: "SHIPPED" },
  SHIPPED: { label: "Out for delivery", next: "OUT_FOR_DELIVERY" },
  OUT_FOR_DELIVERY: { label: "Mark delivered", next: "DELIVERED" },
};

export default function Deliveries() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = () =>
    fetchOrders()
      .then(setOrders)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const onAdvance = async (o: CustomerOrder) => {
    setUpdating(o.id);
    try {
      const step = NEXT_STEP[o.status];
      if (!step?.next) throw new Error("Cannot advance");
      if (step.next === "DELIVERED") {
        await api.post(`/tracking/order/${o.id}/update`, { status: "DELIVERED" });
      } else {
        await api.post(`/orders/${o.id}/advance`);
      }
      toast.success(`Order moved to ${step.next.replace(/_/g, " ")}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <Spinner />;

  const active = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Deliveries & Fulfilment" description="Track and update customer orders end to end." />
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" hint="Customer orders will appear here once the marketplace takes off." />
      ) : (
        <div className="space-y-3">
          {active.length === 0 && (
            <p className="card text-sm text-stone-500">No active orders 🎉 All orders delivered.</p>
          )}
          {orders.map((o) => {
            const step = NEXT_STEP[o.status];
            return (
              <div key={o.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-forest">{o.orderNumber}</p>
                      <Badge status={o.status} />
                    </div>
                    <p className="mt-1 text-sm text-stone-500">
                      {fmtDate(o.createdAt)} · {o.items?.length ?? 0} item(s) · <b>{fmtINR(o.total)}</b>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(o.items ?? []).map((i) => (
                        <span key={i.id} className="badge bg-stone-100 text-stone-600">
                          {i.title} · {i.quantityKg}kg
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {step?.next && (
                      <>
                        <div className="w-40">
                          <div className="flex h-1.5 overflow-hidden rounded-full bg-stone-200">
                            <div
                              className="h-full bg-forest"
                              style={{ width: `${(o.status === "CONFIRMED" ? 20 : 40)}%` }}
                            />
                          </div>
                        </div>
                        <button
                          className="btn-primary !py-1.5"
                          disabled={updating === o.id}
                          onClick={() => onAdvance(o)}
                        >
                          {updating === o.id ? "Updating..." : step.label}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}