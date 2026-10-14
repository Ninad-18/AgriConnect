import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyBids } from "@/services/bids";
import { fetchProcurements } from "@/services/procurements";
import { fetchFarmerProfile } from "@/services/auth";
import type { Bid, ProcurementRequest, FarmerProfile } from "@/types";
import { fmtINR, fmtKg, fmtDate } from "@/lib/format";
import { StatCard, Spinner, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function FarmerDashboard() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [procs, setProcs] = useState<ProcurementRequest[]>([]);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([fetchMyBids(), fetchProcurements(), fetchFarmerProfile()]).then(
      ([b, p, pr]) => {
        if (b.status === "fulfilled") setBids(b.value);
        if (p.status === "fulfilled") setProcs(p.value);
        if (pr.status === "fulfilled") setProfile(pr.value);
        setLoading(false);
      }
    );
  }, []);

  if (loading) return <Spinner />;

  const active = bids.filter((b) => b.status === "ACTIVE").length;
  const won = bids.filter((b) => b.status === "ACCEPTED").length;
  const totalBidQty = bids.reduce((acc, b) => acc + b.quantityKg, 0);
  const openProcs = procs.filter((p) => p.status === "OPEN").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title={`Welcome back, ${profile?.farmName ? `from ${profile.farmName}` : "Farmer"}!`}
        description="Track your bids, contracts and new opportunities."
        actions={
          <Link to="/farmer/procurements" className="btn-primary">
            Browse open procurements
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active bids" value={active} tone="blue" />
        <StatCard label="Contracts won" value={won} tone="green" />
        <StatCard label="Total bid quantity" value={fmtKg(totalBidQty)} tone="orange" />
        <StatCard label="Open procurements" value={openProcs} tone="blue" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-forest">My latest bids</h2>
          {bids.length === 0 ? (
            <p className="card text-sm text-stone-500">
              You have not placed any bids yet.{" "}
              <Link to="/farmer/procurements" className="font-semibold text-forest underline">
                Find a procurement
              </Link>{" "}
              to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {bids.slice(0, 5).map((b) => (
                <div key={b.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-forest">{b.procurement?.product?.name ?? "Procurement"}</p>
                    <p className="text-xs text-stone-500">
                      {fmtKg(b.quantityKg)} at {fmtINR(b.pricePerKg)}/kg
                    </p>
                  </div>
                  <Badge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-forest">Open opportunities</h2>
          {procs.filter((p) => p.status === "OPEN").length === 0 ? (
            <p className="card text-sm text-stone-500">No open procurements right now. Check back soon.</p>
          ) : (
            <div className="space-y-3">
              {procs
                .filter((p) => p.status === "OPEN")
                .slice(0, 5)
                .map((p) => (
                  <div key={p.id} className="card flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-forest">{p.product?.name}</p>
                      <p className="text-xs text-stone-500">
                        {fmtKg(p.quantityKg)} · Grade {p.minGrade}+ · Due {fmtDate(p.deliveryDate)}
                      </p>
                    </div>
                    <Link to={`/farmer/procurements/${p.id}/bid`} className="btn-secondary !py-1.5">
                      Bid
                    </Link>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}