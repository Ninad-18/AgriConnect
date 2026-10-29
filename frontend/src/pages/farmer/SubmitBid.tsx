import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { fetchProcurement } from "@/services/procurements";
import { createBid, fetchMyBids, updateBid } from "@/services/bids";
import { isUploadable, getErrorMessage, getUploadValidationMessage } from "@/services/api";
import type { ProcurementRequest, Bid } from "@/types";
import { fmtINR, fmtKg, fmtDate, isPast } from "@/lib/format";
import { Spinner, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchBidsForProcurement } from "@/services/bids";
import { getLocalizedProductName } from "@/lib/products";

const GRADE_RANK: Record<"A" | "B" | "C", number> = { A: 3, B: 2, C: 1 };

export default function SubmitBid() {
  const { t } = useTranslation(["farmer", "common"]);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proc, setProc] = useState<ProcurementRequest | null>(null);
  const [peerBids, setPeerBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [quantityKg, setQuantityKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [grade, setGrade] = useState<"A" | "B" | "C">("A");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [note, setNote] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [existingBidId, setExistingBidId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchProcurement(id)
      .then(async (p) => {
        setProc(p);
        setGrade(p.minGrade);
        const [bids, myBids] = await Promise.all([fetchBidsForProcurement(id), fetchMyBids()]);
        setPeerBids(bids);
        const existing = myBids.find((bid) => bid.procurementId === id && (bid.status === "ACTIVE" || bid.status === "SUBMITTED"));
        if (existing) {
          setExistingBidId(existing.id);
          setQuantityKg(String(existing.quantityKg));
          setPricePerKg(String(existing.pricePerKg));
          setGrade(existing.grade);
          setDeliveryDate(existing.deliveryDate.slice(0, 10));
          setNote(existing.note ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const expired = useMemo(() => (proc ? isPast(proc.bidDeadline) : false), [proc]);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const candidates = Array.from(files);
    const rejected = candidates.find((file) => !isUploadable(file));
    if (rejected) toast.error(getUploadValidationMessage(rejected));
    const ok = candidates.filter((f) => isUploadable(f));
    setImages((prev) => [...prev, ...ok].slice(0, 5));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !proc) return;
    if (Number(quantityKg) <= 0)
      return toast.error(t("submitBid.validationQty", { defaultValue: "Enter a valid quantity" }));
    if (Number(pricePerKg) <= 0)
      return toast.error(t("submitBid.validationPrice", { defaultValue: "Enter a valid price" }));
    setSubmitting(true);
    try {
      const bidData = {
        quantityKg: Number(quantityKg),
        pricePerKg: Number(pricePerKg),
        grade,
        deliveryDate: new Date(deliveryDate).toISOString(),
        note: note || undefined,
      };
      if (existingBidId) {
        if (images.length) {
          return toast.error("Image changes require withdrawing and submitting a new bid.");
        }
        await updateBid(existingBidId, bidData);
        toast.success("Bid updated.");
      } else {
        await createBid({ procurementId: id, ...bidData, images });
        toast.success(t("submitBid.success", { defaultValue: "Bid submitted! Good luck." }));
      }
      navigate("/farmer/bids");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!proc)
    return (
      <p className="py-12 text-center text-stone-500">
        {t("submitBid.notFound", { defaultValue: "Procurement not found." })}
      </p>
    );

  const canBid = proc.status === "OPEN" && !expired;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title={t("submitBid.title", {
          crop: getLocalizedProductName(proc.product?.name),
          defaultValue: `Bid on ${getLocalizedProductName(proc.product?.name)} procurement`,
        })}
        description={
          <>
            {fmtKg(proc.quantityKg)} ·{" "}
            {t("common:grades.minGrade", {
              grade: proc.minGrade,
              defaultValue: `min grade ${proc.minGrade}+`,
            })}{" "}
            ·{" "}
            {t("procurements.bidDeadline", {
              date: fmtDate(proc.bidDeadline),
              defaultValue: `bid deadline ${fmtDate(proc.bidDeadline)}`,
            })}
          </>
        }
        actions={
          <Link to="/farmer/procurements" className="btn-secondary">
            {t("common:actions.back", { defaultValue: "Back" })}
          </Link>
        }
      />

      {!canBid && (
        <div className="card mb-6 border-amber-300 bg-amber-50 text-sm text-amber-700">
          {t("submitBid.closedNotice", { defaultValue: "Bidding is closed for this procurement." })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="label">
              {t("submitBid.quantityLabel", { defaultValue: "Quantity (kg)" })}
            </label>
            <input
              className="input"
              type="number"
              min="1"
              required
              value={quantityKg}
              onChange={(e) => setQuantityKg(e.target.value)}
            />
          </div>
          <div>
            <label className="label">
              {t("submitBid.pricePerKgLabel", { defaultValue: "Price per kg (₹)" })}
            </label>
            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={pricePerKg}
              onChange={(e) => setPricePerKg(e.target.value)}
              placeholder={
                proc.targetPrice
                  ? t("procurements.target", { price: proc.targetPrice, defaultValue: `Target ${proc.targetPrice}` })
                  : ""
              }
            />
            {proc.targetPrice && (
              <p className="mt-1 text-xs text-stone-500">
                {t("submitBid.supplierTarget", {
                  price: fmtINR(proc.targetPrice),
                  defaultValue: `Supplier target: ${fmtINR(proc.targetPrice)}/kg`,
                })}
              </p>
            )}
          </div>
          <div>
            <label className="label">
              {t("submitBid.gradeOffered", { defaultValue: "Grade offered" })}
            </label>
            <div className="flex gap-2">
              {(["A", "B", "C"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  disabled={GRADE_RANK[g] < GRADE_RANK[proc.minGrade]}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold ${
                    grade === g
                      ? "border-forest bg-forest text-white"
                      : "border-stone-300 text-stone-600 disabled:opacity-30"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">
              {t("submitBid.deliveryDateLabel", { defaultValue: "Delivery date" })}
            </label>
            <input
              className="input"
              type="date"
              required
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={proc.deliveryDate.slice(0, 10)}
            />
          </div>
          <div>
            <label className="label">
              {t("submitBid.noteLabel", { defaultValue: "Note to supplier (optional)" })}
            </label>
            <textarea
              className="input"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("submitBid.notePlaceholder", {
                defaultValue: "Growing practices, harvest details, etc.",
              })}
            />
          </div>
          <div>
            <label className="label">
              {t("submitBid.photosLabel", { defaultValue: "Produce photos (up to 5)" })}
            </label>
            <input className="input" type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />
            {images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((f, i) => (
                  <span key={i} className="badge bg-green-100 text-green-700">
                    {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button className="btn-primary w-full" type="submit" disabled={submitting || !canBid}>
            {submitting
              ? t("submitBid.submitting", { defaultValue: "Submitting..." })
              : t("submitBid.submitBtn", { defaultValue: "Submit bid" })}
          </button>
        </form>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-forest">
            {t("submitBid.marketContext", { defaultValue: "Market context" })}
          </h3>
          {peerBids.length === 0 ? (
            <p className="card text-sm text-stone-500">
              {t("submitBid.noBidsPlaced", { defaultValue: "No bids placed yet — be the first!" })}
            </p>
          ) : (
            <div className="space-y-2">
              {peerBids.map((b) => (
                <div key={b.id} className="card flex items-center justify-between !p-3">
                  <div>
                    <p className="text-sm font-semibold text-forest">
                      {fmtINR(b.pricePerKg)}
                      {t("common:units.perKg", { defaultValue: "/kg" })}
                    </p>
                    <p className="text-xs text-stone-500">
                      {fmtKg(b.quantityKg)} ·{" "}
                      {t("common:grades.gradeLabel", { grade: b.grade, defaultValue: `Grade ${b.grade}` })}
                    </p>
                  </div>
                  <Badge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
