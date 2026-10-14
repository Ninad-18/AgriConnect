import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchListings } from "@/services/products";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { getErrorMessage } from "@/services/api";
import type { ProductListing } from "@/types";
import { fmtINR, fmtKg } from "@/lib/format";
import { Spinner, EmptyState } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Marketplace() {
  const { add } = useCart();
  const [listings, setListings] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");

  useEffect(() => {
    fetchListings()
      .then(setListings)
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () =>
      listings.filter(
        (l) =>
          l.title.toLowerCase().includes(search.toLowerCase()) &&
          (!grade || l.inventory?.grade === grade)
      ),
    [listings, search, grade]
  );

  const onAdd = async (l: ProductListing) => {
    try {
      await add(l.id, 1);
      toast.success("Added to cart");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="Fresh Produce Marketplace"
        description="Graded, farm-fresh produce straight from verified suppliers."
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search produce..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[10rem]" value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">All grades</option>
          <option value="A">Grade A</option>
          <option value="B">Grade B</option>
          <option value="C">Grade C</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState title="No products found" hint="Suppliers publish listings as their verified inventory grows." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((l) => (
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
                    {l.title}
                  </Link>
                  {l.inventory?.grade && (
                    <span className="badge bg-green-100 text-green-700">Grade {l.inventory.grade}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {l.inventory ? fmtKg(Math.max(0, l.inventory.quantityKg - l.inventory.reservedKg)) : "?"} available
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-lg font-bold text-forest">
                    {fmtINR(l.pricePerKg)}<span className="text-xs font-medium text-stone-400">/kg</span>
                  </p>
                  <button className="btn-terracotta !px-3 !py-1.5" onClick={() => onAdd(l)}>
                    Add to cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}