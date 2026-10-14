import { useEffect, useState } from "react";
import { fetchMyBids, withdrawBid } from "@/services/bids";
import { toast } from "sonner";
import { getErrorMessage } from "@/services/api";
import type { Bid } from "@/types";
import { fmtINR, fmtKg, fmtDate, isPast } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function MyBids() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetchMyBids()
      .then(setBids)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const onWithdraw = async (b: Bid) => {
    try {
      await withdrawBid(b.id);
      toast.success("Bid withdrawn");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="My Bids" description="Active, accepted and historical bids." />
      {bids.length === 0 ? (
        <EmptyState title="No bids yet" hint="Browse procurements to place your first bid." />
      ) : (
        <div className="space-y-3">
          {bids.map((b) => {
            const deadline = b.procurement?.bidDeadline;
            const modifiable = b.status === "ACTIVE" && deadline && !isPast(deadline);
            return (
              <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-forest">{b.procurement?.product?.name ?? "Procurement"}</p>
                    <Badge status={b.status} />
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    {fmtKg(b.quantityKg)} at {fmtINR(b.pricePerKg)}/kg · Grade {b.grade} · deliver {fmtDate(b.deliveryDate)}
                  </p>
                  {b.procurement && (
                    <p className="text-xs text-stone-400">
                      Bid deadline: {fmtDate(b.procurement.bidDeadline)}
                      {b.contracts && b.contracts.length > 0 && (
                        <span className="ml-2 text-green-600">✓ {b.contracts.length} contract(s) created</span>
                      )}
                    </p>
                  )}
                </div>
                {modifiable && (
                  <button className="btn-secondary !py-1.5" onClick={() => onWithdraw(b)}>
                    Withdraw
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}