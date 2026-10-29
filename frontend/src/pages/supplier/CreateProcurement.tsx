import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createProcurement } from "@/services/procurements";
import { fetchCropSuggestions } from "@/services/products";
import { getErrorMessage } from "@/services/api";
import type { CreateProcurementInput } from "@/services/procurements";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocalizedProductName } from "@/lib/products";

const ALL_CROPS = [
  "Wheat", "Paddy", "Rice", "Maize", "Bajra", "Jowar", "Soybean", "Groundnut",
  "Cotton", "Sugarcane", "Tomato", "Onion", "Potato", "Chilli", "Ladyfinger",
  "Brinjal", "Cabbage", "Cauliflower", "Mango", "Banana", "Grapes", "Orange",
  "Guava", "Apple", "Turmeric", "Ginger", "Mustard",
];

export default function CreateProcurement() {
  const { t } = useTranslation(["supplier", "common"]);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [cropOptions, setCropOptions] = useState<string[]>(ALL_CROPS);
  const [form, setForm] = useState({
    productName: "",
    quantityKg: "",
    minGrade: "B" as "A" | "B" | "C",
    deliveryDate: "",
    bidDeadline: "",
    transport: "SUPPLIER" as "SUPPLIER" | "FARMER",
    allowPartial: true,
    allocationMode: "SMART" as "SMART" | "MANUAL",
    targetPrice: "",
    notes: "",
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    fetchCropSuggestions()
      .then((crops) => {
        if (crops.length === 0) return;
        const merged = new Map<string, string>();
        for (const crop of [...ALL_CROPS, ...crops]) {
          merged.set(crop.trim().toLowerCase(), crop.trim());
        }
        setCropOptions([...merged.values()].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {
        // Suggestions are optional; the free-text crop field still works.
      });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productName)
      return toast.error(t("createProcurement.validationSelectCrop", { defaultValue: "Select a crop" }));
    if (Number(form.quantityKg) <= 0)
      return toast.error(t("createProcurement.validationQty", { defaultValue: "Enter a valid quantity" }));
    if (new Date(form.bidDeadline) >= new Date(form.deliveryDate)) {
      return toast.error(
        t("createProcurement.validationDeadlineBeforeDelivery", {
          defaultValue: "Bid deadline must be before delivery date",
        })
      );
    }
    setSubmitting(true);
    try {
      const input: CreateProcurementInput = {
        productName: form.productName,
        quantityKg: Number(form.quantityKg),
        minGrade: form.minGrade,
        deliveryDate: new Date(form.deliveryDate).toISOString(),
        bidDeadline: new Date(form.bidDeadline).toISOString(),
        transport: form.transport,
        allowPartial: form.allowPartial,
        allocationMode: form.allocationMode,
        targetPrice: form.targetPrice ? Number(form.targetPrice) : undefined,
        notes: form.notes || undefined,
      };
      const proc = await createProcurement(input);
      toast.success(t("createProcurement.success", { defaultValue: "Procurement created" }));
      navigate(`/supplier/procurements/${proc.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={t("createProcurement.title", { defaultValue: "New Procurement Request" })}
        description={t("createProcurement.description", {
          defaultValue: "Farmers will be notified and can start bidding immediately.",
        })}
      />
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">
            {t("createProcurement.cropLabel", { defaultValue: "Crop / produce" })}
          </label>
          <input
            className="input"
            list="crop-suggestions"
            value={form.productName}
            onChange={(e) => set("productName", e.target.value)}
            placeholder={t("createProcurement.cropPlaceholder", {
              defaultValue: "Type or select a crop (custom crops allowed)",
            })}
          />
          <datalist id="crop-suggestions">
            {cropOptions.map((c) => (
              <option key={c} value={c}>
                {getLocalizedProductName(c)}
              </option>
            ))}
          </datalist>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">
              {t("createProcurement.quantityLabel", { defaultValue: "Quantity (kg)" })}
            </label>
            <input
              className="input"
              type="number"
              min="1"
              required
              value={form.quantityKg}
              onChange={(e) => set("quantityKg", e.target.value)}
            />
          </div>
          <div>
            <label className="label">
              {t("createProcurement.minGradeLabel", { defaultValue: "Minimum grade" })}
            </label>
            <div className="flex gap-2">
              {(["A", "B", "C"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set("minGrade", g)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold ${
                    form.minGrade === g ? "border-forest bg-forest text-white" : "border-stone-300 text-stone-600"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">
              {t("createProcurement.bidDeadlineLabel", { defaultValue: "Bid deadline" })}
            </label>
            <input
              className="input"
              type="datetime-local"
              required
              value={form.bidDeadline}
              onChange={(e) => set("bidDeadline", e.target.value)}
            />
          </div>
          <div>
            <label className="label">
              {t("createProcurement.deliveryDateLabel", { defaultValue: "Delivery date" })}
            </label>
            <input
              className="input"
              type="date"
              required
              value={form.deliveryDate}
              onChange={(e) => set("deliveryDate", e.target.value)}
            />
          </div>
          <div>
            <label className="label">
              {t("createProcurement.transportLabel", { defaultValue: "Transport arrangement" })}
            </label>
            <div className="flex gap-2">
              {(
                [
                  ["SUPPLIER", t("common:transport.SUPPLIER", { defaultValue: "Supplier arranges" })],
                  ["FARMER", t("common:transport.FARMER", { defaultValue: "Farmer arranges" })],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set("transport", k)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                    form.transport === k ? "border-forest bg-forest text-white" : "border-stone-300 text-stone-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">
              {t("createProcurement.targetPriceLabel", { defaultValue: "Target price (₹/kg, optional)" })}
            </label>
            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              value={form.targetPrice}
              onChange={(e) => set("targetPrice", e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              checked={form.allowPartial}
              onChange={(e) => set("allowPartial", e.target.checked)}
            />
            {t("createProcurement.allowPartial", { defaultValue: "Allow partial fulfillment" })}
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              checked={form.allocationMode === "SMART"}
              onChange={(e) => set("allocationMode", e.target.checked ? "SMART" : "MANUAL")}
            />
            {t("createProcurement.enableSmart", {
              defaultValue: "Enable smart allocation recommendations",
            })}
          </label>
        </div>
        <div>
          <label className="label">{t("createProcurement.notesLabel", { defaultValue: "Notes" })}</label>
          <textarea className="input" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
        <button className="btn-primary w-full" type="submit" disabled={submitting}>
          {submitting
            ? t("createProcurement.publishing", { defaultValue: "Creating..." })
            : t("createProcurement.publishBtn", { defaultValue: "Publish procurement" })}
        </button>
      </form>
    </div>
  );
}
