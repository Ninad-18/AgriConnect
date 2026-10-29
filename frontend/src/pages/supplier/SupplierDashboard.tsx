import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchProcurements } from "@/services/procurements";
import { fetchSupplierContracts, type ContractGroup } from "@/services/contracts";
import { fetchInventory } from "@/services/inventory";
import { fetchSupplierProfile } from "@/services/auth";
import type { ProcurementRequest, SupplierProfile, InventoryItem } from "@/types";
import { fmtKg, fmtDate } from "@/lib/format";
import { StatCard, Spinner, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocalizedProductName } from "@/lib/products";

export default function SupplierDashboard() {
  const { t } = useTranslation(["supplier", "common"]);
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
        title={
          profile?.companyName
            ? t("dashboard.welcome", { name: profile.companyName, defaultValue: `Welcome, ${profile.companyName}` })
            : t("dashboard.welcomeDefault", { defaultValue: "Supplier Dashboard" })
        }
        description={t("dashboard.description", {
          defaultValue: "Manage procurements, contracts, inventory and deliveries.",
        })}
        actions={
          <Link to="/supplier/procurements/new" className="btn-primary">
            {t("dashboard.newProcurement", { defaultValue: "+ New procurement" })}
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("dashboard.openProcurements", { defaultValue: "Open procurements" })}
          value={open}
          tone="green"
        />
        <StatCard
          label={t("dashboard.needsSelection", { defaultValue: "Needs selection" })}
          value={leading}
          tone="orange"
        />
        <StatCard
          label={t("dashboard.activeContracts", { defaultValue: "Active contracts" })}
          value={contractCount}
          tone="blue"
        />
        <StatCard
          label={t("dashboard.stockInInventory", { defaultValue: "Stock in inventory" })}
          value={fmtKg(totalStock)}
          tone="orange"
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-forest">
          {t("dashboard.recentProcurements", { defaultValue: "Recent procurements" })}
        </h2>
        {procs.length === 0 ? (
          <div className="card border-dashed text-center">
            <p className="text-sm text-stone-500">
              {t("dashboard.noProcurementsYet", { defaultValue: "No procurements yet." })}
            </p>
            <Link to="/supplier/procurements/new" className="btn-primary mt-3">
              {t("dashboard.createFirstProcurement", { defaultValue: "Create your first procurement" })}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {procs.slice(0, 6).map((p) => (
              <Link key={p.id} to={`/supplier/procurements/${p.id}`} className="card transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-forest">{getLocalizedProductName(p.product?.name)}</p>
                  <Badge status={p.status} />
                </div>
                <p className="mt-2 text-sm text-stone-500">
                  {fmtKg(p.quantityKg)} ·{" "}
                  {t("common:grades.minGrade", { grade: p.minGrade, defaultValue: `min ${p.minGrade}+` })} ·{" "}
                  {t("dashboard.deliverBy", {
                    date: fmtDate(p.deliveryDate),
                    defaultValue: `deliver by ${fmtDate(p.deliveryDate)}`,
                  })}
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  {t("dashboard.bidsCount", { count: p._count?.bids ?? 0, defaultValue: `${p._count?.bids ?? 0} bids` })}{" "}
                  ·{" "}
                  {t("dashboard.contractsCount", {
                    count: p._count?.contracts ?? 0,
                    defaultValue: `${p._count?.contracts ?? 0} contracts`,
                  })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
