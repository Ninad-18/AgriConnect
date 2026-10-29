import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { fetchSupplierContracts } from "@/services/contracts";
import { receiveContract, verifyQuality } from "@/services/quality";
import { getErrorMessage } from "@/services/api";
import type { FarmerContract, QualityVerification } from "@/types";
import { fmtINR, fmtKg, fmtDate } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocalizedProductName } from "@/lib/products";

export default function Contracts() {
  const { t } = useTranslation(["supplier", "farmer", "common"]);
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof fetchSupplierContracts>>>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [modal, setModal] = useState<FarmerContract | null>(null);

  const load = () =>
    fetchSupplierContracts()
      .then(setGroups)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const onReceive = async (c: FarmerContract) => {
    try {
      await receiveContract(c.id);
      toast.success(t("contracts.markedReceivedSuccess", { defaultValue: "Produce marked as received" }));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onVerify = async (
    c: FarmerContract,
    outcome: string,
    payload?: Omit<Partial<QualityVerification>, "outcome">
  ) => {
    setVerifying(c.id);
    try {
      await verifyQuality({
        contractId: c.id,
        outcome: outcome as "ACCEPTED" | "ADJUSTED" | "REJECTED" | "DISPUTED",
        ...payload,
      });
      toast.success(`Contract ${outcome.toLowerCase()}`);
      setModal(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setVerifying(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title={t("contracts.title", { defaultValue: "Farmer Contracts" })}
        description={t("contracts.description", {
          defaultValue: "Receive produce, verify quality and manage fulfillment.",
        })}
      />
      {groups.length === 0 ? (
        <EmptyState
          title={t("contracts.emptyTitle", { defaultValue: "No contracts yet" })}
          hint={t("contracts.emptyHint", {
            defaultValue: "Accept bids on your procurements to generate contracts.",
          })}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.procurementId} className="card">
              <h3 className="font-semibold text-forest">
                {getLocalizedProductName(g.productName)}{" "}
                <span className="text-sm font-normal text-stone-400">· {fmtKg(g.quantityKg)}</span>
              </h3>
              <div className="mt-3 space-y-3">
                {g.contracts.map((c) => (
                  <ContractCard
                    key={c.id}
                    c={c}
                    onReceive={() => onReceive(c)}
                    onOpenVerify={() => setModal(c)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {modal && (
        <VerifyModal
          c={modal}
          busy={verifying === modal.id}
          onClose={() => setModal(null)}
          onVerify={(outcome, payload) => onVerify(modal, outcome, payload)}
        />
      )}
    </div>
  );
}

function ContractCard({
  c,
  onReceive,
  onOpenVerify,
}: {
  c: FarmerContract;
  onReceive: () => void;
  onOpenVerify: () => void;
}) {
  const { t } = useTranslation(["supplier", "farmer", "common"]);
  const receivable = ["CREATED", "ACCEPTED", "IN_DELIVERY"].includes(c.status);
  const verifyable = ["RECEIVED", "VERIFIED"].includes(c.status) || c.status === "RECEIVED";
  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-stone-700">
              {c.farmer?.name ?? t("procurementDetail.farmerLabel", { defaultValue: "Farmer" })}
            </span>
            <Badge status={c.status} />
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {fmtKg(c.quantityKg)} @ {fmtINR(c.pricePerKg)}
            {t("common:units.perKg", { defaultValue: "/kg" })} → <b>{fmtINR(c.amount)}</b> ·{" "}
            {t("common:grades.gradeLabel", { grade: c.grade, defaultValue: `grade ${c.grade}` })} ·{" "}
            {t("farmer:contracts.created", {
              date: fmtDate(c.createdAt),
              defaultValue: `created ${fmtDate(c.createdAt)}`,
            })}
          </p>
          <p className="text-xs text-stone-400">
            {t("farmer:contracts.delivered", {
              qty: fmtKg(c.deliveredQuantityKg),
              defaultValue: `Delivered ${fmtKg(c.deliveredQuantityKg)}`,
            })}{" "}
            ·{" "}
            {t("farmer:contracts.accepted", {
              qty: fmtKg(c.acceptedQuantityKg),
              defaultValue: `accepted ${fmtKg(c.acceptedQuantityKg)}`,
            })}
          </p>
        </div>
        <div className="flex gap-2">
          {receivable && (
            <button className="btn-secondary !py-1.5" onClick={onReceive}>
              {t("contracts.markReceived", { defaultValue: "Mark received" })}
            </button>
          )}
          {verifyable && (
            <button className="btn-primary !py-1.5" onClick={onOpenVerify}>
              {t("contracts.verifyQuality", { defaultValue: "Verify quality" })}
            </button>
          )}
        </div>
      </div>
      {c.verifications && c.verifications.length > 0 && (
        <div className="mt-2 border-t border-stone-100 pt-2">
          {c.verifications.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <Badge status={v.outcome} />
              <span>
                {t("farmer:contracts.declared", {
                  grade: v.declaredGrade,
                  defaultValue: `Declared ${v.declaredGrade}`,
                })}{" "}
                ·{" "}
                {v.actualGrade
                  ? t("farmer:contracts.actual", {
                      grade: v.actualGrade,
                      defaultValue: `actual ${v.actualGrade}`,
                    })
                  : t("farmer:contracts.actualTbd", { defaultValue: "actual TBD" })}
                {v.adjustedPriceKg
                  ? ` · ${t("farmer:contracts.adjusted", {
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
  );
}

function VerifyModal({
  c,
  busy,
  onClose,
  onVerify,
}: {
  c: FarmerContract;
  busy: boolean;
  onClose: () => void;
  onVerify: (outcome: string, payload?: Partial<QualityVerification>) => void;
}) {
  const { t } = useTranslation(["supplier", "common"]);
  const [outcome, setOutcome] = useState<string>("ACCEPTED");
  const [grade, setGrade] = useState<string>(c.grade);
  const [adjustedPrice, setAdjustedPrice] = useState(String(c.pricePerKg));
  const [notes, setNotes] = useState("");

  const payload = (): Partial<QualityVerification> => ({
    actualGrade: grade as "A" | "B" | "C",
    adjustedPriceKg: outcome === "ADJUSTED" ? Number(adjustedPrice) : undefined,
    notes: notes || undefined,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-forest">
          {t("contracts.verifyModalTitle", {
            qty: fmtKg(c.quantityKg),
            defaultValue: `Verify quality · ${fmtKg(c.quantityKg)}`,
          })}
        </h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">{t("contracts.outcomeLabel", { defaultValue: "Outcome" })}</label>
            <div className="grid grid-cols-2 gap-2">
              {["ACCEPTED", "ADJUSTED", "REJECTED", "DISPUTED"].map((o) => (
                <button
                  key={o}
                  onClick={() => setOutcome(o)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    outcome === o ? "border-forest bg-forest text-white" : "border-stone-300 text-stone-600"
                  }`}
                >
                  <Badge status={o} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{t("contracts.actualGradeLabel", { defaultValue: "Actual grade" })}</label>
            <div className="flex gap-2">
              {(["A", "B", "C"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                    grade === g ? "border-forest bg-forest text-white" : "border-stone-300 text-stone-600"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          {outcome === "ADJUSTED" && (
            <div>
              <label className="label">
                {t("contracts.adjustedPriceLabel", { defaultValue: "Adjusted price (₹/kg)" })}
              </label>
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                value={adjustedPrice}
                onChange={(e) => setAdjustedPrice(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="label">{t("contracts.notesLabel", { defaultValue: "Notes" })}</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={onClose}>
              {t("common:actions.cancel", { defaultValue: "Cancel" })}
            </button>
            <button className="btn-primary" disabled={busy} onClick={() => onVerify(outcome, payload())}>
              {busy
                ? t("contracts.verifying", { defaultValue: "Saving..." })
                : t("contracts.submitVerification", { defaultValue: "Submit verification" })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
