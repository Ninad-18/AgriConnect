import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchListing } from "@/services/products";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { getErrorMessage } from "@/services/api";
import type { ProductListing } from "@/types";
import { fmtINR, fmtKg } from "@/lib/format";
import { Spinner } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocalizedProductName } from "@/lib/products";

export default function ProductDetail() {
  const { t } = useTranslation(["customer", "common"]);
  const { id } = useParams<{ id: string }>();
  const { add } = useCart();
  const [listing, setListing] = useState<ProductListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchListing(id)
      .then(setListing)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (!listing)
    return (
      <p className="py-12 text-center text-stone-500">
        {t("productDetail.notFound", { defaultValue: "Product not found." })}
      </p>
    );

  const available = Math.max(0, (listing.inventory?.quantityKg ?? 0) - (listing.inventory?.reservedKg ?? 0));

  const onAdd = async () => {
    setAdding(true);
    try {
      await add(listing.id, qty);
      toast.success(t("marketplace.addedToCart", { defaultValue: "Added to cart" }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title={getLocalizedProductName(listing.title, listing.inventory?.cropName)}
        actions={
          <Link to="/marketplace" className="btn-secondary">
            {t("productDetail.backToMarketplace", { defaultValue: "Back to marketplace" })}
          </Link>
        }
      />
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          {listing.images && listing.images.length > 0 && Array.isArray(listing.images) ? (
            <img src={listing.images[0]} alt={getLocalizedProductName(listing.title, listing.inventory?.cropName)} className="w-full rounded-2xl object-cover shadow" />
          ) : (
            <div className="flex h-72 items-center justify-center rounded-2xl bg-sand text-6xl">🌿</div>
          )}
        </div>
        <div className="card self-start">
          <div className="flex items-center gap-2">
            {listing.inventory?.grade && (
              <span className="badge bg-green-100 text-green-700">
                {t("common:grades.gradeLabel", {
                  grade: listing.inventory.grade,
                  defaultValue: `Grade ${listing.inventory.grade}`,
                })}
              </span>
            )}
            <span className="badge bg-stone-100 text-stone-600">
              {getLocalizedProductName(listing.inventory?.cropName)}
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-forest">
            {fmtINR(listing.pricePerKg)}
            <span className="text-sm font-medium text-stone-400">
              {t("common:units.perKg", { defaultValue: "/kg" })}
            </span>
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {t("productDetail.available", {
              qty: fmtKg(available),
              defaultValue: `${fmtKg(available)} available`,
            })}
          </p>
          {listing.description && <p className="mt-4 text-sm text-stone-600">{listing.description}</p>}
          <div className="mt-6 flex items-end gap-3">
            <div>
              <label className="label">
                {t("productDetail.quantityLabel", { defaultValue: "Quantity (kg)" })}
              </label>
              <input
                className="input w-32"
                type="number"
                min={1}
                max={Math.max(1, available)}
                value={qty}
                onChange={(e) => setQty(Math.min(Number(e.target.value) || 1, Math.max(1, available)))}
              />
            </div>
            <button className="btn-terracotta flex-1" disabled={adding || available <= 0} onClick={onAdd}>
              {adding
                ? t("productDetail.adding", { defaultValue: "Adding..." })
                : t("productDetail.addToCart", { defaultValue: "Add to cart" })}
            </button>
          </div>
          <p className="mt-2 text-xs text-stone-400">
            {t("productDetail.total", { defaultValue: "Total:" })}{" "}
            <b>{fmtINR(listing.pricePerKg * qty)}</b>
          </p>
        </div>
      </div>
    </div>
  );
}
