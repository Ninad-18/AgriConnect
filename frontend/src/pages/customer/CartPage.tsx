import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";
import { fmtINR, fmtKg } from "@/lib/format";
import { EmptyState, Spinner } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocalizedProductName } from "@/lib/products";

export default function CartPage() {
  const { t } = useTranslation(["customer", "common"]);
  const { user } = useAuth();
  const { cart, loading, update, remove, clear } = useCart();
  const navigate = useNavigate();

  const items = cart?.items ?? [];
  const subtotal = items.reduce((a, i) => a + i.quantityKg * (i.unitPrice || i.listing?.pricePerKg || 0), 0);
  const delivery = 0;
  const total = subtotal + delivery;

  const onUpdate = async (itemId: string, listingId: string, qty: number) => {
    try {
      await update(itemId, Math.max(1, qty));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onRemove = async (itemId: string) => {
    try {
      await remove(itemId);
      toast.success(t("cart.removedSuccess", { defaultValue: "Removed from cart" }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onClear = async () => {
    await clear();
    toast.success(t("cart.clearedSuccess", { defaultValue: "Cart cleared" }));
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title={t("cart.title", { defaultValue: "Your Cart" })}
        actions={
          items.length > 0 ? (
            <button className="btn-secondary text-red-600" onClick={onClear}>
              {t("cart.clearCart", { defaultValue: "Clear cart" })}
            </button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title={t("cart.emptyTitle", { defaultValue: "Your cart is empty" })}
          hint={t("cart.emptyHint", { defaultValue: "Browse the marketplace to add fresh produce." })}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3 md:col-span-2">
            {items.map((i) => {
              const listing = i.listing ?? ({} as typeof i.listing);
              const unitPrice = i.unitPrice || listing.pricePerKg || 0;
              return (
                <div key={i.id} className="card flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-sand">
                    {listing.images && listing.images.length > 0 && Array.isArray(listing.images) ? (
                      <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl">🌿</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Link to={`/products/${i.listingId}`} className="font-semibold text-forest hover:underline">
                      {listing.title
                        ? getLocalizedProductName(listing.title, listing.inventory?.cropName)
                        : t("cart.item", { defaultValue: "Item" })}
                    </Link>
                    <p className="text-sm text-stone-500">
                      {fmtINR(unitPrice)}
                      {t("common:units.perKg", { defaultValue: "/kg" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="h-8 w-8 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50"
                      onClick={() => onUpdate(i.id, i.listingId, i.quantityKg - 1)}
                    >
                      −
                    </button>
                    <input
                      className="input !w-16 text-center"
                      type="number"
                      min={1}
                      value={i.quantityKg}
                      onChange={(e) => onUpdate(i.id, i.listingId, Number(e.target.value) || 1)}
                    />
                    <button
                      className="h-8 w-8 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50"
                      onClick={() => onUpdate(i.id, i.listingId, i.quantityKg + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="w-24 text-right">
                    <p className="font-bold text-forest">{fmtINR(i.quantityKg * unitPrice)}</p>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => onRemove(i.id)}>
                      {t("cart.remove", { defaultValue: "Remove" })}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card self-start">
            <h3 className="font-semibold text-forest">
              {t("cart.orderSummary", { defaultValue: "Order summary" })}
            </h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>
                  {t("cart.subtotal", {
                    qty: fmtKg(items.reduce((a, i) => a + i.quantityKg, 0)),
                    defaultValue: `Subtotal (${fmtKg(items.reduce((a, i) => a + i.quantityKg, 0))})`,
                  })}
                </span>
                <span>{fmtINR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>{t("cart.delivery", { defaultValue: "Delivery" })}</span>
                <span>
                  {delivery === 0 ? (
                    <span className="text-green-600 font-semibold">{t("cart.free", { defaultValue: "FREE" })}</span>
                  ) : (
                    fmtINR(delivery)
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-2 font-bold text-forest">
                <span>{t("cart.total", { defaultValue: "Total" })}</span>
                <span>{fmtINR(total)}</span>
              </div>
            </div>
            {!user && (
              <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                {t("cart.loginNotice", { defaultValue: "Login to checkout and get your order delivered." })}
              </p>
            )}
            <button
              className="btn-primary mt-4 w-full"
              onClick={() => (user ? navigate("/checkout") : navigate("/auth/login"))}
            >
              {t("cart.proceedCheckout", { defaultValue: "Proceed to checkout" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
