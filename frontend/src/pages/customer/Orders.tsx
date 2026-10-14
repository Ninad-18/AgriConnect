import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchOrders } from "@/services/orders";
import type { CustomerOrder } from "@/types";
import { fmtINR, fmtDate } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Orders() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="My Orders"
        actions={<Link to="/marketplace" className="btn-primary">Shop more</Link>}
      />
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" hint="Your placed orders will appear here with live tracking." />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-forest">{o.orderNumber}</p>
                    <Badge status={o.status} />
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    {fmtDate(o.createdAt)} · {o.items?.length ?? 0} items
                  </p>
                </div>
                <p className="text-lg font-bold text-forest">{fmtINR(o.total)}</p>
              </div>
              <div className="mt-3 border-t border-stone-100 pt-2">
                {(o.items ?? []).map((i) => (
                  <div key={i.id} className="flex justify-between py-1 text-sm text-stone-600">
                    <span>
                      {i.title} <span className="text-xs text-stone-400">× {i.quantityKg}kg</span>
                    </span>
                    <span>{fmtINR(i.amount)}</span>
                  </div>
                ))}
              </div>
              {o.payment && (
                <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
                  <span className="font-semibold">Payment:</span>
                  <Badge status={o.payment.status} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}