import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchListings } from "@/services/products";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { getErrorMessage } from "@/services/api";
import type { ProductListing } from "@/types";
import { fmtINR, fmtKg } from "@/lib/format";
import { Spinner, EmptyState } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocalizedProductName, matchesProductSearch } from "@/lib/products";

type SortKey = "newest" | "price_asc" | "price_desc";

function availableKg(listing: ProductListing) {
  return Math.max(
    0,
    (listing.inventory?.quantityKg ?? 0) - (listing.inventory?.reservedKg ?? 0)
  );
}

export default function Marketplace() {
  const { t } = useTranslation(["customer", "common"]);
  const { add } = useCart();
  const [listings, setListings] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [addingId, setAddingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchListings()
      .then(setListings)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const max = Number(maxPrice);
    const filtered = listings.filter(
      (l) =>
        (matchesProductSearch(l.title, search) ||
          (l.inventory?.cropName && matchesProductSearch(l.inventory.cropName, search)) ||
          (l.product?.cropName && matchesProductSearch(l.product.cropName, search))) &&
        (!grade || l.inventory?.grade === grade) &&
        (!Number.isFinite(max) || max <= 0 || l.pricePerKg <= max)
    );
    return [...filtered].sort((a, b) => {
      if (sort === "price_asc") return a.pricePerKg - b.pricePerKg;
      if (sort === "price_desc") return b.pricePerKg - a.pricePerKg;
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });
  }, [listings, search, grade, maxPrice, sort]);

  const onAdd = async (l: ProductListing) => {
    const quantity = Math.min(1, availableKg(l));
    if (quantity <= 0) return;
    setAddingId(l.id);
    try {
      await add(l.id, quantity);
      toast.success(t("marketplace.addedToCart", { defaultValue: "Added to cart" }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title={t("marketplace.title", { defaultValue: "Fresh Produce Marketplace" })}
        description={t("marketplace.description", {
          defaultValue: "Graded, farm-fresh produce straight from verified farmers and suppliers.",
        })}
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder={t("marketplace.searchPlaceholder", { defaultValue: "Search produce..." })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[10rem]" value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">{t("marketplace.allGrades", { defaultValue: "All grades" })}</option>
          <option value="A">{t("common:grades.gradeA", { defaultValue: "Grade A" })}</option>
          <option value="B">{t("common:grades.gradeB", { defaultValue: "Grade B" })}</option>
          <option value="C">{t("common:grades.gradeC", { defaultValue: "Grade C" })}</option>
        </select>
        <input
          className="input max-w-[10rem]"
          type="number"
          min="0"
          placeholder={t("marketplace.maxPrice", { defaultValue: "Max ₹/kg" })}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        <select
          className="input max-w-[12rem]"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="newest">{t("marketplace.sortNewest", { defaultValue: "Newest first" })}</option>
          <option value="price_asc">{t("marketplace.sortPriceLow", { defaultValue: "Price: low to high" })}</option>
          <option value="price_desc">{t("marketplace.sortPriceHigh", { defaultValue: "Price: high to low" })}</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="card text-center">
          <p className="text-sm font-semibold text-red-600">{error}</p>
          <button className="btn-secondary mt-3" onClick={load}>
            {t("common:actions.retry", { defaultValue: "Try again" })}
          </button>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title={t("marketplace.emptyTitle", { defaultValue: "No products found" })}
          hint={t("marketplace.emptyHint", {
            defaultValue: "Farmers and suppliers publish listings as their stock becomes available.",
          })}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((l) => {
            const available = availableKg(l);
            const crop = l.inventory?.cropName ?? l.product?.cropName;
            return (
              <div key={l.id} className="card overflow-hidden transition hover:shadow-md">
                <Link to={`/products/${l.id}`}>
                  {l.images && l.images.length > 0 && Array.isArray(l.images) ? (
                    <img
                      src={l.images[0]}
                      alt={l.title}
                      className="h-44 w-full object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-sand text-4xl">🌿</div>
                  )}
                </Link>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/products/${l.id}`} className="font-semibold text-forest hover:underline">
                      {getLocalizedProductName(l.title, crop)}
                    </Link>
                    {l.inventory?.grade && (
                      <span className="badge bg-green-100 text-green-700">
                        {t("common:grades.gradeLabel", { grade: l.inventory.grade, defaultValue: `Grade ${l.inventory.grade}` })}
                      </span>
                    )}
                  </div>
                  {l.seller && (
                    <p className="mt-1 text-xs text-stone-500">
                      {t("marketplace.soldBy", { defaultValue: "Sold by" })}{" "}
                      <span className="font-medium text-stone-700">{l.seller.name}</span>
                      {" · "}
                      {t(`common:roles.${l.seller.role}`, { defaultValue: l.seller.role })}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-stone-500">
                    {available > 0
                      ? t("marketplace.available", {
                          qty: fmtKg(available),
                          defaultValue: `${fmtKg(available)} available`,
                        })
                      : t("marketplace.outOfStock", { defaultValue: "Out of stock" })}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-lg font-bold text-forest">
                      {fmtINR(l.pricePerKg)}
                      <span className="text-xs font-medium text-stone-400">
                        {t("common:units.perKg", { defaultValue: "/kg" })}
                      </span>
                    </p>
                    <button
                      className="btn-terracotta !px-3 !py-1.5"
                      disabled={available <= 0 || addingId === l.id}
                      onClick={() => onAdd(l)}
                    >
                      {addingId === l.id
                        ? t("marketplace.adding", { defaultValue: "Adding..." })
                        : t("marketplace.addToCart", { defaultValue: "Add to cart" })}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
