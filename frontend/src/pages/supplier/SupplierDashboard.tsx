import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProcurements } from "@/services/procurements";
import { fetchSupplierContracts, type ContractGroup } from "@/services/contracts";
import { fetchInventory } from "@/services/inventory";
import { fetchSupplierProfile } from "@/services/auth";
import type { ProcurementRequest, SupplierProfile, InventoryItem } from "@/types";
import { fmtINR, fmtKg, fmtDate } from "@/lib/format";
import { StatCard, Spinner } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SupplierDashboard() {
  const [procs, setProcs] = useState<ProcurementRequest[]>([]);
  const [contracts, setContracts] = useState<ContractGroup[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetchProcurements(),
      fetchSupplierContracts(),
      fetchInventory(),
      fetchSupplierProfile(),
    ]).then(([p, c, i, pr]) => {
      if (p.status === "fulfilled") setProcs(p.value);
      if (c.status === "fulfilled") setContracts(c.value);
      if (i.status === "fulfilled") setInventory(i.value);
      if (pr.status === "fulfilled") setProfile(pr.value);
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner />;

  const open = procs.filter((p) => p.status === "OPEN").length;
  const leading = procs.filter((p) => p.status === "BIDDING_CLOSED" || p.status === "UNDER_SELECTION").length;
  const totalStock = inventory.reduce((a, i) => a + i.quantityKg, 0);
  const contractCount = contracts.reduce((a, g) => a + g.contracts.length, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title={profile?.companyName ? `Welcome, ${profile.companyName}` : "Supplier Dashboard"}
        description="Manage procurements, contracts, inventory and deliveries."
        actions={
          <Link to="/supplier/procurements/new" className="btn-primary">
            + New procurement
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open procurements" value={open} tone="green" />
        <StatCard label="Needs selection" value={leading} tone="orange" />
        <StatCard label="Active contracts" value={contractCount} tone="blue" />
        <StatCard label="Stock in inventory" value={fmtKg(totalStock)} tone="orange" />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-forest">Recent procurements</h2>
        {procs.length === 0 ? (
          <div className="card border-dashed text-center">
            <p className="text-sm text-stone-500">No procurements yet.</p>
            <Link to="/supplier/procurements/new" className="btn-primary mt-3">
              Create your first procurement
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {procs.slice(0, 6).map((p) => (
              <Link key={p.id} to={`/supplier/procurements/${p.id}`} className="card transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-forest">{p.product?.name}</p>
                  <span className="badge bg-green-100 text-green-700">{p.status}</span>
                </div>
                <p className="mt-2 text-sm text-stone-500">
                  {fmtKg(p.quantityKg)} · min {p.minGrade}+ · deliver by {fmtDate(p.deliveryDate)}
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  {p._count?.bids ?? 0} bids · {p._count?.contracts ?? 0} contracts
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}