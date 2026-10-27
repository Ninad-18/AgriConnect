import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchMyBids, withdrawBid } from "@/services/bids";
import { toast } from "sonner";
import { getErrorMessage } from "@/services/api";
import type { Bid } from "@/types";
import { fmtINR, fmtKg, fmtDate, isPast } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocalizedProductName } from "@/lib/products";

export default function MyBids() {
  const { t } = useTranslation(["farmer", "common"]);
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
      toast.success(t("myBids.withdrawnSuccess", { defaultValue: "Bid withdrawn" }));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title={t("myBids.title", { defaultValue: "My Bids" })}
        description={t("myBids.description", { defaultValue: "Active, accepted and historical bids." })}
      />
      {bids.length === 0 ? (
        <EmptyState
          title={t("myBids.emptyTitle", { defaultValue: "No bids yet" })}
          hint={t("myBids.emptyHint", { defaultValue: "Browse procurements to place your first bid." })}
        />
      ) : (
        <div className="space-y-3">
          {bids.map((b) => {
            const deadline = b.procurement?.bidDeadline;
            const modifiable = b.status === "ACTIVE" && deadline && !isPast(deadline);
            return (
              <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-forest">
                      {b.procurement?.product?.name
                        ? getLocalizedProductName(b.procurement.product.name)
                        : "Procurement"}
                    </p>
                    <Badge status={b.status} />
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    {fmtKg(b.quantityKg)} at {fmtINR(b.pricePerKg)}
                    {t("common:units.perKg", { defaultValue: "/kg" })} ·{" "}
                    {t("common:grades.gradeLabel", { grade: b.grade, defaultValue: `Grade ${b.grade}` })} ·{" "}
                    {t("myBids.deliverOn", {
                      date: fmtDate(b.deliveryDate),
                      defaultValue: `deliver ${fmtDate(b.deliveryDate)}`,
                    })}
                  </p>
                  {b.procurement && (
                    <p className="text-xs text-stone-400">
                      {t("myBids.bidDeadline", {
                        date: fmtDate(b.procurement.bidDeadline),
                        defaultValue: `Bid deadline: ${fmtDate(b.procurement.bidDeadline)}`,
                      })}
                      {b.contracts && b.contracts.length > 0 && (
                        <span className="ml-2 text-green-600">
                          {t("myBids.contractsCreated", {
                            count: b.contracts.length,
                            defaultValue: `✓ ${b.contracts.length} contract(s) created`,
                          })}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                {modifiable && (
                  <button className="btn-secondary !py-1.5" onClick={() => onWithdraw(b)}>
                    {t("myBids.withdraw", { defaultValue: "Withdraw" })}
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
