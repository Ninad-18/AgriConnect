import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProcurements, updateProcurementStatus } from "@/services/procurements";
import { toast } from "sonner";
import { getErrorMessage } from "@/services/api";
import type { ProcurementRequest } from "@/types";
import { fmtKg, fmtDate } from "@/lib/format";
import { StatCard, Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ManageProcurements() {
  const [procs, setProcs] = useState<ProcurementRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProcurements()
      .then(setProcs)
      .finally(() => setLoading(false));
  }, []);

  const onClose = async (p: ProcurementRequest) => {
    try {
      await updateProcurementStatus(p.id, "BIDDING_CLOSED");
      toast.success("Bidding closed");
      setProcs((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "BIDDING_CLOSED" } : x)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onCancel = async (p: ProcurementRequest) => {
    try {
      if (!confirm("Cancel this procurement? This cannot be undone.")) return;
      await updateProcurementStatus(p.id, "CANCELLED");
      toast.success("Procurement cancelled");
      setProcs((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "CANCELLED" } : x)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="My Procurements"
        actions={<Link to="/supplier/procurements/new" className="btn-primary">+ New</Link>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Open" value={procs.filter((p) => p.status === "OPEN").length} tone="green" />
        <StatCard label="Awaiting selection" value={procs.filter((p) => p.status === "BIDDING_CLOSED" || p.status === "UNDER_SELECTION").length} tone="orange" />
        <StatCard label="Total" value={procs.length} tone="blue" />
      </div>

      {procs.length === 0 ? (
        <EmptyState title="No procurements yet" hint="Create your first procurement request." />
      ) : (
        <div className="space-y-3">
          {procs.map((p) => (
            <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-forest">{p.product?.name}</p>
                  <Badge status={p.status} />
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  {fmtKg(p.quantityKg)} · min {p.minGrade}+ · bid deadline {fmtDate(p.bidDeadline)} · deliver {fmtDate(p.deliveryDate)}
                </p>
                <p className="text-xs text-stone-400">
                  {p._count?.bids ?? 0} bids · {p._count?.contracts ?? 0} contracts
                </p>
              </div>
              <div className="flex gap-2">
                <Link to={`/supplier/procurements/${p.id}`} className="btn-secondary !py-1.5">
                  Open
                </Link>
                {p.status === "OPEN" && (
                  <>
                    <button className="btn-primary !py-1.5" onClick={() => onClose(p)}>Close bidding</button>
                    <button className="btn-secondary !py-1.5 text-red-600" onClick={() => onCancel(p)}>Cancel</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}