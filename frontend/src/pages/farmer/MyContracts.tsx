import { useEffect, useState } from "react";
import { fetchFarmerContracts } from "@/services/contracts";
import type { FarmerContract } from "@/types";
import { fmtINR, fmtKg, fmtDate } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function MyContracts() {
  const [contracts, setContracts] = useState<FarmerContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFarmerContracts()
      .then(setContracts)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="My Contracts" description="Contracts created from your accepted bids." />
      {contracts.length === 0 ? (
        <EmptyState title="No contracts yet" hint="Once a supplier accepts your bid, a contract is created here." />
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <div key={c.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-forest">{fmtKg(c.quantityKg)} @ {fmtINR(c.pricePerKg)}/kg</p>
                  <Badge status={c.status} />
                </div>
                <p className="text-sm font-bold text-forest">{fmtINR(c.amount)}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-stone-500">
                <span>Grade: {c.grade}</span>
                <span>Transport: {c.transport}</span>
                <span>Delivered: {fmtKg(c.deliveredQuantityKg)}</span>
                <span>Accepted: {fmtKg(c.acceptedQuantityKg)}</span>
                <span>Created: {fmtDate(c.createdAt)}</span>
              </div>
              {c.verifications && c.verifications.length > 0 && (
                <div className="mt-3 border-t border-stone-100 pt-2">
                  {c.verifications.map((v) => (
                    <div key={v.id} className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <Badge status={v.outcome} />
                      <span>
                        Declared {v.declaredGrade} · {v.actualGrade ? `Actual ${v.actualGrade}` : "actual TBD"}
                        {v.adjustedPriceKg ? ` · adjusted ${fmtINR(v.adjustedPriceKg)}/kg` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}