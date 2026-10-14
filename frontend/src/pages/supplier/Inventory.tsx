import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchInventory } from "@/services/inventory";
import type { InventoryItem } from "@/types";
import { fmtKg } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const available = items.filter((i) => i.status !== "SOLD_OUT").reduce((a, i) => a + (i.quantityKg - i.reservedKg), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Inventory"
        description="Stock received from farmer contracts after quality verification."
        actions={
          <Link to="/supplier/products" className="btn-secondary">
            Manage listings
          </Link>
        }
      />
      <div className="mb-6 card sm:w-72">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Sellable stock (unreserved)</p>
        <p className="mt-1 text-2xl font-bold text-forest">{fmtKg(available)}</p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No inventory yet"
          hint="Inventory grows automatically once supplier verifies and accepts delivered produce."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-white">
              <tr className="text-left">
                <th className="table-head">Crop</th>
                <th className="table-head">Grade</th>
                <th className="table-head">Quantity</th>
                <th className="table-head">Reserved</th>
                <th className="table-head">Sellable</th>
                <th className="table-head">Status</th>
                <th className="table-head">Listing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((i) => (
                <tr key={i.id} className="bg-white">
                  <td className="table-cell font-semibold text-forest">{i.cropName}</td>
                  <td className="table-cell">{i.grade}</td>
                  <td className="table-cell">{fmtKg(i.quantityKg)}</td>
                  <td className="table-cell">{fmtKg(i.reservedKg)}</td>
                  <td className="table-cell font-semibold">{fmtKg(i.quantityKg - i.reservedKg)}</td>
                  <td className="table-cell"><Badge status={i.status} /></td>
                  <td className="table-cell">
                    {i.listing ? (
                      <Link to={`/products/${i.listing.id}`} className="font-semibold text-forest underline">
                        {i.listing.title}
                      </Link>
                    ) : (
                      <Link to="/supplier/products" className="text-terracotta font-semibold">
                        + Create listing
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}