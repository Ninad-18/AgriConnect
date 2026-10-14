import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProcurements } from "@/services/procurements";
import type { ProcurementRequest } from "@/types";
import { fmtINR, fmtKg, fmtDate, isPast } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ProcurementList() {
  const [procs, setProcs] = useState<ProcurementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchProcurements({ role: "FARMER" })
      .then(setProcs)
      .finally(() => setLoading(false));
  }, []);

  const visible = procs.filter((p) => {
    if (filter === "all") return true;
    if (filter === "open") return p.status === "OPEN";
    if (filter === "closed") return p.status !== "OPEN";
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="Procurement Requests"
        description="Bid on live requirements from verified suppliers."
      />
      <div className="mb-4 flex gap-2">
        {[
          ["all", "All"],
          ["open", "Open for bidding"],
          ["closed", "Closed"],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === k ? "bg-forest text-white" : "bg-white text-stone-600 border border-stone-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState title="No procurements found" hint="Check back soon for new requirements." />
      ) : (
        <div className="space-y-4">
          {visible.map((p) => {
            const expired = isPast(p.bidDeadline);
            return (
              <div key={p.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-forest">{p.product?.name}</h3>
                      <Badge status={p.status} />
                    </div>
                    <p className="mt-1 text-sm text-stone-500">
                      {fmtKg(p.quantityKg)} · Min grade <b>{p.minGrade}+</b> · Transport: {p.transport === "SUPPLIER" ? "Supplier arranges" : "Farmer arranges"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-stone-500">
                      <span>
                        Bid deadline: <b>{fmtDate(p.bidDeadline)}</b> {expired && <span className="text-red-500">(passed)</span>}
                      </span>
                      <span>Delivery by: <b>{fmtDate(p.deliveryDate)}</b></span>
                      {p.targetPrice && <span>Target: <b>{fmtINR(p.targetPrice)}/kg</b></span>}
                      <span>Bids so far: <b>{p._count?.bids ?? 0}</b></span>
                    </div>
                  </div>
                  <Link
                    to={`/farmer/procurements/${p.id}/bid`}
                    className={`btn-primary ${p.status !== "OPEN" || expired ? "pointer-events-none opacity-40" : ""}`}
                  >
                    Submit bid
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}