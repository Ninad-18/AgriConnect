import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { fetchProcurement } from "@/services/procurements";
import { createBid } from "@/services/bids";
import { isUploadable, getErrorMessage } from "@/services/api";
import type { ProcurementRequest, Bid } from "@/types";
import { fmtINR, fmtKg, fmtDate, isPast } from "@/lib/format";
import { Spinner, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchBidsForProcurement } from "@/services/bids";

export default function SubmitBid() {
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

  useEffect(() => {
    if (!id) return;
    fetchProcurement(id)
      .then(async (p) => {
        setProc(p);
        setGrade(p.minGrade);
        const bids = await fetchBidsForProcurement(id);
        setPeerBids(bids);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const expired = useMemo(() => (proc ? isPast(proc.bidDeadline) : false), [proc]);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const ok = Array.from(files).filter((f) => isUploadable(f));
    setImages((prev) => [...prev, ...ok].slice(0, 5));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !proc) return;
    if (Number(quantityKg) <= 0) return toast.error("Enter a valid quantity");
    if (Number(pricePerKg) <= 0) return toast.error("Enter a valid price");
    setSubmitting(true);
    try {
      await createBid({
        procurementId: id,
        quantityKg: Number(quantityKg),
        pricePerKg: Number(pricePerKg),
        grade,
        deliveryDate: new Date(deliveryDate).toISOString(),
        note: note || undefined,
        images,
      });
      toast.success("Bid submitted! Good luck.");
      navigate("/farmer/bids");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!proc) return <p className="py-12 text-center text-stone-500">Procurement not found.</p>;

  const canBid = proc.status === "OPEN" && !expired;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title={`Bid on ${proc.product?.name} procurement`}
        description={
          <>
            {fmtKg(proc.quantityKg)} required · min grade <b>{proc.minGrade}+</b> · bid deadline{" "}
            <b>{fmtDate(proc.bidDeadline)}</b>
          </>
        }
        actions={<Link to="/farmer/procurements" className="btn-secondary">Back</Link>}
      />

      {!canBid && (
        <div className="card mb-6 border-amber-300 bg-amber-50 text-sm text-amber-700">
          Bidding is closed for this procurement.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="label">Quantity (kg)</label>
            <input className="input" type="number" min="1" required value={quantityKg} onChange={(e) => setQuantityKg(e.target.value)} />
          </div>
          <div>
            <label className="label">Price per kg (₹)</label>
            <input className="input" type="number" min="0.01" step="0.01" required value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} placeholder={proc.targetPrice ? `Target ${proc.targetPrice}` : ""} />
            {proc.targetPrice && <p className="mt-1 text-xs text-stone-500">Supplier target: {fmtINR(proc.targetPrice)}/kg</p>}
          </div>
          <div>
            <label className="label">Grade offered</label>
            <div className="flex gap-2">
              {(["A", "B", "C"] as const).map((g) => (
                <button key={g} type="button" onClick={() => setGrade(g)} disabled={g < proc.minGrade}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold ${
                    grade === g ? "border-forest bg-forest text-white" : "border-stone-300 text-stone-600 disabled:opacity-30"
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Delivery date</label>
            <input className="input" type="date" required value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} min={proc.deliveryDate.slice(0, 10)} />
          </div>
          <div>
            <label className="label">Note to supplier (optional)</label>
            <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Growing practices, harvest details, etc." />
          </div>
          <div>
            <label className="label">Produce photos (up to 5)</label>
            <input className="input" type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />
            {images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((f, i) => (
                  <span key={i} className="badge bg-green-100 text-green-700">{f.name}</span>
                ))}
              </div>
            )}
          </div>
          <button className="btn-primary w-full" type="submit" disabled={submitting || !canBid}>
            {submitting ? "Submitting..." : "Submit bid"}
          </button>
        </form>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-forest">Market context</h3>
          {peerBids.length === 0 ? (
            <p className="card text-sm text-stone-500">No bids placed yet — be the first!</p>
          ) : (
            <div className="space-y-2">
              {peerBids.map((b) => (
                <div key={b.id} className="card flex items-center justify-between !p-3">
                  <div>
                    <p className="text-sm font-semibold text-forest">{fmtINR(b.pricePerKg)}/kg</p>
                    <p className="text-xs text-stone-500">{fmtKg(b.quantityKg)} · Grade {b.grade}</p>
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