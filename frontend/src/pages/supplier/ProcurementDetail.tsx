import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { fetchProcurement, fetchRecommendations, acceptBids } from "@/services/procurements";
import { getErrorMessage } from "@/services/api";
import type { ProcurementRequest, AllocationResult, Bid } from "@/types";
import { fmtINR, fmtKg, fmtDate } from "@/lib/format";
import { Spinner, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ProcurementDetail() {
  const { id } = useParams<{ id: string }>();
  const [proc, setProc] = useState<ProcurementRequest | null>(null);
  const [alloc, setAlloc] = useState<AllocationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [accepting, setAccepting] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      const [p, a] = await Promise.all([
        fetchProcurement(id),
        fetchRecommendations(id).catch(() => null),
      ]);
      setProc(p);
      setAlloc(a);
      setSelected((p.bids as unknown as Bid[])?.filter((b) => b.status === "ACCEPTED").map((b) => b.id) ?? []);
    } catch {
      // handled below
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const bids = useMemo<Bid[]>(() => (proc?.bids as unknown as Bid[]) ?? [], [proc]);

  const canAccept =
    proc?.status === "OPEN" ||
    proc?.status === "BIDDING_CLOSED" ||
    proc?.status === "UNDER_SELECTION";

  const toggleBid = (bidId: string) => {
    setSelected((prev) =>
      prev.includes(bidId) ? prev.filter((x) => x !== bidId) : [...prev, bidId]
    );
  };

  const onAccept = async () => {
    if (!id || selected.length === 0) return;
    setAccepting(true);
    try {
      const res = await acceptBids(id, {
        bidIds: selected,
        allocationMode: alloc ? "SMART" : undefined,
      });
      toast.success(`Created ${res.contracts?.length ?? 0} contract(s)`);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!proc) return <p className="py-12 text-center text-stone-500">Procurement not found.</p>;

  const selectedTotal = bids
    .filter((b) => selected.includes(b.id))
    .reduce((a, b) => a + b.quantityKg, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title={`${proc.product?.name} procurement`}
        description={`${fmtKg(proc.quantityKg)} · reached ${fmtKg(proc.awardedQuantityKg ?? 0)} · grade ${proc.minGrade}+`}
        actions={
          <div className="flex items-center gap-2">
            {canAccept && (
              <button className="btn-primary" disabled={accepting || selected.length === 0} onClick={onAccept}>
                {accepting ? "Creating contracts..." : `Accept ${selected.length} bid(s)`}
              </button>
            )}
            <Link to="/supplier/procurements" className="btn-secondary">Back</Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Status" value={<Badge status={proc.status} />} />
        <Info label="Bids received" value={String(bids.length)} />
        <Info label="Selected total" value={fmtKg(selectedTotal)} />
        <Info label="Remaining needed" value={fmtKg(Math.max(0, proc.requiredQuantityKg ?? proc.quantityKg - (proc.awardedQuantityKg ?? 0)))} />
      </div>

      {alloc && (
        <div className="card mb-6 bg-sand">
          <h3 className="font-semibold text-forest">Smart allocation recommendation</h3>
          <p className="mt-1 text-sm text-stone-500">
            Recommended {alloc.rankedBids?.filter((b) => b.score >= 0.5).length ?? 0} of {alloc.rankedBids?.length ?? 0} bids · coverage{" "}
            {Math.round(((alloc.coverage ?? 0) * 100))}% · est. total ₹{(alloc.totalCost ?? 0).toLocaleString("en-IN")}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                  <th className="table-head">Rank</th>
                  <th className="table-head">Quantity</th>
                  <th className="table-head">Price/kg</th>
                  <th className="table-head">Grade</th>
                  <th className="table-head">Score</th>
                  <th className="table-head">Action</th>
                </tr>
              </thead>
              <tbody>
                {(alloc.rankedBids ?? []).map((b, i) => {
                  const bid = bids.find((x) => x.id === b.id);
                  return (
                    <tr key={b.id} className="border-b border-stone-100">
                      <td className="table-cell">#{i + 1}</td>
                      <td className="table-cell">{fmtKg(b.quantityKg)}</td>
                      <td className="table-cell">{fmtINR(b.pricePerKg)}</td>
                      <td className="table-cell">{b.grade}</td>
                      <td className="table-cell">
                        <span className={b.score >= 0.5 ? "text-green-600 font-semibold" : "text-stone-400"}>
                          {(b.score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                            selected.includes(b.id)
                              ? "border-forest bg-forest text-white"
                              : "border-stone-300 text-stone-600"
                          }`}
                          onClick={() => bid && toggleBid(bid.id)}
                        >
                          {selected.includes(b.id) ? "Selected" : "Select"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold text-forest">All bids</h2>
      {bids.length === 0 ? (
        <p className="card text-sm text-stone-500">No bids yet. Farmers will be notified as they come in.</p>
      ) : (
        <div className="space-y-3">
          {bids.map((b) => {
            const isSelected = selected.includes(b.id);
            return (
              <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    disabled={!canAccept}
                    checked={isSelected}
                    onChange={() => toggleBid(b.id)}
                  />
                  <div>
                    <p className="font-semibold text-forest">
                      {fmtKg(b.quantityKg)} @ {fmtINR(b.pricePerKg)}/kg
                      <span className="ml-2 text-sm font-normal text-stone-400">Grade {b.grade}</span>
                    </p>
                    <p className="text-xs text-stone-500">
                      {b.farmer?.name ?? "Farmer"} · {b.distanceKm ? `${b.distanceKm} km` : "?"} · deliver {fmtDate(b.deliveryDate)}
                      {b.note ? ` · ${b.note}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {b.contracts && b.contracts.length > 0 && (
                    <span className="badge bg-blue-100 text-blue-700">{b.contracts.length} contract(s)</span>
                  )}
                  <Badge status={b.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{label}</p>
      <div className="mt-1 text-lg font-bold text-forest">{value}</div>
    </div>
  );
}