import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchFarmerContracts } from "@/services/contracts";
import type { FarmerContract } from "@/types";
import { fmtINR, fmtKg, fmtDate } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function MyContracts() {
  const { t } = useTranslation(["farmer", "common"]);
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
      <PageHeader
        title={t("contracts.title", { defaultValue: "My Contracts" })}
        description={t("contracts.description", {
          defaultValue: "Contracts created from your accepted bids.",
        })}
      />
      {contracts.length === 0 ? (
        <EmptyState
          title={t("contracts.emptyTitle", { defaultValue: "No contracts yet" })}
          hint={t("contracts.emptyHint", {
            defaultValue: "Once a supplier accepts your bid, a contract is created here.",
          })}
        />
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <div key={c.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-forest">
                    {fmtKg(c.quantityKg)} @ {fmtINR(c.pricePerKg)}
                    {t("common:units.perKg", { defaultValue: "/kg" })}
                  </p>
                  <Badge status={c.status} />
                </div>
                <p className="text-sm font-bold text-forest">{fmtINR(c.amount)}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-stone-500">
                <span>
                  {t("contracts.grade", {
                    grade: c.grade,
                    defaultValue: `Grade: ${c.grade}`,
                  })}
                </span>
                <span>
                  {t("contracts.transport", {
                    transport:
                      c.transport === "SUPPLIER"
                        ? t("common:transport.SUPPLIER", { defaultValue: "Supplier arranges" })
                        : t("common:transport.FARMER", { defaultValue: "Farmer arranges" }),
                    defaultValue: `Transport: ${c.transport}`,
                  })}
                </span>
                <span>
                  {t("contracts.delivered", {
                    qty: fmtKg(c.deliveredQuantityKg),
                    defaultValue: `Delivered: ${fmtKg(c.deliveredQuantityKg)}`,
                  })}
                </span>
                <span>
                  {t("contracts.accepted", {
                    qty: fmtKg(c.acceptedQuantityKg),
                    defaultValue: `Accepted: ${fmtKg(c.acceptedQuantityKg)}`,
                  })}
                </span>
                <span>
                  {t("contracts.created", {
                    date: fmtDate(c.createdAt),
                    defaultValue: `Created: ${fmtDate(c.createdAt)}`,
                  })}
                </span>
              </div>
              {c.verifications && c.verifications.length > 0 && (
                <div className="mt-3 border-t border-stone-100 pt-2">
                  {c.verifications.map((v) => (
                    <div key={v.id} className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <Badge status={v.outcome} />
                      <span>
                        {t("contracts.declared", { grade: v.declaredGrade, defaultValue: `Declared ${v.declaredGrade}` })} ·{" "}
                        {v.actualGrade
                          ? t("contracts.actual", { grade: v.actualGrade, defaultValue: `Actual ${v.actualGrade}` })
                          : t("contracts.actualTbd", { defaultValue: "actual TBD" })}
                        {v.adjustedPriceKg
                          ? ` · ${t("contracts.adjusted", {
                              price: fmtINR(v.adjustedPriceKg),
                              defaultValue: `adjusted ${fmtINR(v.adjustedPriceKg)}/kg`,
                            })}`
                          : ""}
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
