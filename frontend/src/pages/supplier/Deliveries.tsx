import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { fetchOrders } from "@/services/orders";
import { getErrorMessage } from "@/services/api";
import { api } from "@/services/api";
import type { CustomerOrder } from "@/types";
import { fmtINR, fmtDate } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

const NEXT_STEP: Record<string, { key: string; label: string; next: string | null }> = {
  CONFIRMED: { key: "markProcessing", label: "Mark processing", next: "PROCESSING" },
  PROCESSING: { key: "markPacked", label: "Mark packed", next: "PACKED" },
  PACKED: { key: "markShipped", label: "Mark shipped", next: "SHIPPED" },
  SHIPPED: { key: "outForDelivery", label: "Out for delivery", next: "OUT_FOR_DELIVERY" },
  OUT_FOR_DELIVERY: { key: "markDelivered", label: "Mark delivered", next: "DELIVERED" },
};

export default function Deliveries() {
  const { t } = useTranslation(["supplier", "common"]);
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
      const nextStatusName = t(`common:statuses.${step.next}`, { defaultValue: step.next.replace(/_/g, " ") });
      toast.success(
        t("deliveries.orderMoved", { step: nextStatusName, defaultValue: `Order moved to ${nextStatusName}` })
      );
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
      <PageHeader
        title={t("deliveries.title", { defaultValue: "Deliveries & Fulfilment" })}
        description={t("deliveries.description", {
          defaultValue: "Track and update customer orders end to end.",
        })}
      />
      {orders.length === 0 ? (
        <EmptyState
          title={t("deliveries.emptyTitle", { defaultValue: "No orders yet" })}
          hint={t("deliveries.emptyHint", {
            defaultValue: "Customer orders will appear here once the marketplace takes off.",
          })}
        />
      ) : (
        <div className="space-y-3">
          {active.length === 0 && (
            <p className="card text-sm text-stone-500">
              {t("deliveries.noActiveOrders", { defaultValue: "No active orders 🎉 All orders delivered." })}
            </p>
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
                      {fmtDate(o.createdAt)} ·{" "}
                      {t("orders.itemsCount", {
                        count: o.items?.length ?? 0,
                        defaultValue: `${o.items?.length ?? 0} item(s)`,
                      })}{" "}
                      · <b>{fmtINR(o.total)}</b>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(o.items ?? []).map((i) => (
                        <span key={i.id} className="badge bg-stone-100 text-stone-600">
                          {i.title} · {i.quantityKg}
                          {t("common:units.kg", { defaultValue: "kg" })}
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
                              style={{ width: `${o.status === "CONFIRMED" ? 20 : 40}%` }}
                            />
                          </div>
                        </div>
                        <button
                          className="btn-primary !py-1.5"
                          disabled={updating === o.id}
                          onClick={() => onAdvance(o)}
                        >
                          {updating === o.id
                            ? t("deliveries.updating", { defaultValue: "Updating..." })
                            : t(`deliveries.steps.${step.key}`, { defaultValue: step.label })}
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
