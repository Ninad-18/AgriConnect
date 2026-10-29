import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchMyBids } from "@/services/bids";
import { fetchProcurements } from "@/services/procurements";
import { fetchFarmerProfile } from "@/services/auth";
import type { Bid, ProcurementRequest, FarmerProfile } from "@/types";
import { fmtINR, fmtKg, fmtDate } from "@/lib/format";
import { StatCard, Spinner, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocalizedProductName } from "@/lib/products";

export default function FarmerDashboard() {
  const { t } = useTranslation(["farmer", "common"]);
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

  const farmerName = profile?.farmName || t("dashboard.welcomeDefault", { defaultValue: "Farmer" });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title={t("dashboard.welcome", { name: farmerName, defaultValue: `Welcome back, ${farmerName}!` })}
        description={t("dashboard.welcomeSub", {
          defaultValue: "Track your bids, contracts and new opportunities.",
        })}
        actions={
          <Link to="/farmer/procurements" className="btn-primary">
            {t("dashboard.browseProcurements", { defaultValue: "Browse open procurements" })}
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("dashboard.activeBids", { defaultValue: "Active bids" })}
          value={active}
          tone="blue"
        />
        <StatCard
          label={t("dashboard.contractsWon", { defaultValue: "Contracts won" })}
          value={won}
          tone="green"
        />
        <StatCard
          label={t("dashboard.totalBidQty", { defaultValue: "Total bid quantity" })}
          value={fmtKg(totalBidQty)}
          tone="orange"
        />
        <StatCard
          label={t("dashboard.openProcurements", { defaultValue: "Open procurements" })}
          value={openProcs}
          tone="blue"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-forest">
            {t("dashboard.latestBids", { defaultValue: "My latest bids" })}
          </h2>
          {bids.length === 0 ? (
            <p className="card text-sm text-stone-500">
              {t("dashboard.noBidsYet", { defaultValue: "You have not placed any bids yet." })}{" "}
              <Link to="/farmer/procurements" className="font-semibold text-forest underline">
                {t("dashboard.findProcurement", { defaultValue: "Find a procurement" })}
              </Link>{" "}
              {t("dashboard.toGetStarted", { defaultValue: "to get started." })}
            </p>
          ) : (
            <div className="space-y-3">
              {bids.slice(0, 5).map((b) => (
                <div key={b.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-forest">
                      {b.procurement?.product?.name
                        ? getLocalizedProductName(b.procurement.product.name)
                        : "Procurement"}
                    </p>
                    <p className="text-xs text-stone-500">
                      {fmtKg(b.quantityKg)} at {fmtINR(b.pricePerKg)}
                      {t("common:units.perKg", { defaultValue: "/kg" })}
                    </p>
                  </div>
                  <Badge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-forest">
            {t("dashboard.openOpportunities", { defaultValue: "Open opportunities" })}
          </h2>
          {procs.filter((p) => p.status === "OPEN").length === 0 ? (
            <p className="card text-sm text-stone-500">
              {t("dashboard.noOpenProcs", {
                defaultValue: "No open procurements right now. Check back soon.",
              })}
            </p>
          ) : (
            <div className="space-y-3">
              {procs
                .filter((p) => p.status === "OPEN")
                .slice(0, 5)
                .map((p) => (
                  <div key={p.id} className="card flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-forest">{getLocalizedProductName(p.product?.name)}</p>
                      <p className="text-xs text-stone-500">
                        {fmtKg(p.quantityKg)} ·{" "}
                        {t("common:grades.minGrade", {
                          grade: p.minGrade,
                          defaultValue: `Min grade ${p.minGrade}+`,
                        })}{" "}
                        ·{" "}
                        {t("dashboard.due", {
                          date: fmtDate(p.deliveryDate),
                          defaultValue: `Due ${fmtDate(p.deliveryDate)}`,
                        })}
                      </p>
                    </div>
                    <Link to={`/farmer/procurements/${p.id}/bid`} className="btn-secondary !py-1.5">
                      {t("dashboard.bid", { defaultValue: "Bid" })}
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
