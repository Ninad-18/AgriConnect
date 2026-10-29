import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchInventory } from "@/services/inventory";
import type { InventoryItem } from "@/types";
import { fmtKg } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocalizedProductName } from "@/lib/products";

export default function Inventory() {
  const { t } = useTranslation(["supplier", "common"]);
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
        title={t("inventory.title", { defaultValue: "Inventory" })}
        description={t("inventory.description", {
          defaultValue: "Stock received from farmer contracts after quality verification.",
        })}
        actions={
          <Link to="/supplier/products" className="btn-secondary">
            {t("inventory.manageListings", { defaultValue: "Manage listings" })}
          </Link>
        }
      />
      <div className="mb-6 card sm:w-72">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          {t("inventory.sellableStock", { defaultValue: "Sellable stock (unreserved)" })}
        </p>
        <p className="mt-1 text-2xl font-bold text-forest">{fmtKg(available)}</p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={t("inventory.emptyTitle", { defaultValue: "No inventory yet" })}
          hint={t("inventory.emptyHint", {
            defaultValue: "Inventory grows automatically once supplier verifies and accepts delivered produce.",
          })}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-white">
              <tr className="text-left">
                <th className="table-head">{t("inventory.tableCrop", { defaultValue: "Crop" })}</th>
                <th className="table-head">{t("inventory.tableGrade", { defaultValue: "Grade" })}</th>
                <th className="table-head">{t("inventory.tableQuantity", { defaultValue: "Quantity" })}</th>
                <th className="table-head">{t("inventory.tableReserved", { defaultValue: "Reserved" })}</th>
                <th className="table-head">{t("inventory.tableSellable", { defaultValue: "Sellable" })}</th>
                <th className="table-head">{t("inventory.tableStatus", { defaultValue: "Status" })}</th>
                <th className="table-head">{t("inventory.tableListing", { defaultValue: "Listing" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((i) => (
                <tr key={i.id} className="bg-white">
                  <td className="table-cell font-semibold text-forest">{getLocalizedProductName(i.cropName)}</td>
                  <td className="table-cell">{i.grade}</td>
                  <td className="table-cell">{fmtKg(i.quantityKg)}</td>
                  <td className="table-cell">{fmtKg(i.reservedKg)}</td>
                  <td className="table-cell font-semibold">{fmtKg(i.quantityKg - i.reservedKg)}</td>
                  <td className="table-cell">
                    <Badge status={i.status} />
                  </td>
                  <td className="table-cell">
                    {i.listing ? (
                      <Link to={`/products/${i.listing.id}`} className="font-semibold text-forest underline">
                        {i.listing.title}
                      </Link>
                    ) : (
                      <Link to="/supplier/products" className="text-terracotta font-semibold">
                        {t("inventory.createListingLink", { defaultValue: "+ Create listing" })}
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
