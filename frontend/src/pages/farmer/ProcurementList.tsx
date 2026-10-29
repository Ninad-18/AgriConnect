import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchProcurements } from "@/services/procurements";
import type { ProcurementRequest } from "@/types";
import { fmtINR, fmtKg, fmtDate, isPast } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocalizedProductName } from "@/lib/products";

export default function ProcurementList() {
  const { t } = useTranslation(["farmer", "common"]);
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

  const filterButtons = [
    { key: "all", label: t("procurements.filters.all", { defaultValue: "All" }) },
    { key: "open", label: t("procurements.filters.open", { defaultValue: "Open for bidding" }) },
    { key: "closed", label: t("procurements.filters.closed", { defaultValue: "Closed" }) },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title={t("procurements.title", { defaultValue: "Procurement Requests" })}
        description={t("procurements.description", {
          defaultValue: "Bid on live requirements from verified suppliers.",
        })}
      />
      <div className="mb-4 flex gap-2">
        {filterButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === key ? "bg-forest text-white" : "bg-white text-stone-600 border border-stone-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState
          title={t("procurements.emptyTitle", { defaultValue: "No procurements found" })}
          hint={t("procurements.emptyHint", { defaultValue: "Check back soon for new requirements." })}
        />
      ) : (
        <div className="space-y-4">
          {visible.map((p) => {
            const expired = isPast(p.bidDeadline);
            return (
              <div key={p.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-forest">{getLocalizedProductName(p.product?.name)}</h3>
                      <Badge status={p.status} />
                    </div>
                    <p className="mt-1 text-sm text-stone-500">
                      {fmtKg(p.quantityKg)} ·{" "}
                      {t("common:grades.minGrade", {
                        grade: p.minGrade,
                        defaultValue: `Min grade ${p.minGrade}+`,
                      })}{" "}
                      ·{" "}
                      {p.transport === "SUPPLIER"
                        ? t("common:transport.SUPPLIER", { defaultValue: "Supplier arranges" })
                        : t("common:transport.FARMER", { defaultValue: "Farmer arranges" })}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-stone-500">
                      <span>
                        {t("procurements.bidDeadline", {
                          date: fmtDate(p.bidDeadline),
                          defaultValue: `Bid deadline: ${fmtDate(p.bidDeadline)}`,
                        })}{" "}
                        {expired && (
                          <span className="text-red-500">
                            {t("procurements.passed", { defaultValue: "(passed)" })}
                          </span>
                        )}
                      </span>
                      <span>
                        {t("procurements.deliveryBy", {
                          date: fmtDate(p.deliveryDate),
                          defaultValue: `Delivery by: ${fmtDate(p.deliveryDate)}`,
                        })}
                      </span>
                      {p.targetPrice && (
                        <span>
                          {t("procurements.target", {
                            price: fmtINR(p.targetPrice),
                            defaultValue: `Target: ${fmtINR(p.targetPrice)}/kg`,
                          })}
                        </span>
                      )}
                      <span>
                        {t("procurements.bidsSoFar", {
                          count: p._count?.bids ?? 0,
                          defaultValue: `Bids so far: ${p._count?.bids ?? 0}`,
                        })}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/farmer/procurements/${p.id}/bid`}
                    className={`btn-primary ${p.status !== "OPEN" || expired ? "pointer-events-none opacity-40" : ""}`}
                  >
                    {t("procurements.submitBid", { defaultValue: "Submit bid" })}
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
