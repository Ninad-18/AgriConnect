import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { checkout, createPaymentOrder } from "@/services/orders";
import { fetchAddresses, createAddress } from "@/services/customers";
import { getErrorMessage } from "@/services/api";
import type { Address } from "@/types";
import { fmtINR } from "@/lib/format";
import { Spinner, EmptyState } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;

export default function Checkout() {
  const { t } = useTranslation(["customer", "common"]);
  const { cart, loading, clear } = useCart();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [paying, setPaying] = useState(false);
  const [newAddr, setNewAddr] = useState({
    label: "Home",
    line1: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
  });

  useEffect(() => {
    fetchAddresses()
      .then((a) => {
        setAddresses(a);
        const dflt = a.find((x) => x.isDefault) ?? a[0];
        if (dflt) setAddressId(dflt.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (RAZORPAY_KEY) {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      document.body.appendChild(s);
      return () => {
        document.body.removeChild(s);
      };
    }
  }, []);

  if (loading) return <Spinner />;

  const items = cart?.items ?? [];
  const subtotal = items.reduce((a, i) => a + i.quantityKg * (i.unitPrice || i.listing?.pricePerKg || 0), 0);
  const delivery = subtotal >= 500 ? 0 : 40;
  const total = subtotal + delivery;

  const onNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createAddress(newAddr);
      setAddresses((prev) => [...prev, created]);
      setAddressId(created.id);
      setShowNew(false);
      toast.success(t("checkout.addressSavedSuccess", { defaultValue: "Address saved" }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onPay = async () => {
    if (!addressId)
      return toast.error(t("checkout.selectAddressError", { defaultValue: "Select a delivery address" }));
    setPaying(true);
    try {
      const { order } = await checkout(addressId);
      toast.success(t("checkout.orderCreatedSuccess", { defaultValue: "Order created" }));

      if (!RAZORPAY_KEY || !window.Razorpay) {
        toast.warning(
          t("checkout.gatewayNotConfigured", {
            defaultValue:
              "Payment gateway not configured in this environment. Your order is saved as pending payment.",
          })
        );
        await clear();
        navigate("/orders");
        return;
      }

      const payment = await createPaymentOrder(order.id);
      const razorpay = new window.Razorpay({
        key: RAZORPAY_KEY,
        order_id: payment.razorpayOrderId,
        currency: "INR",
        amount: payment.amountPaisa,
        name: "AgriConnect",
        prefill: { email: "", contact: "" },
        handler: async () => {
          toast.success(t("checkout.paymentReceived", { defaultValue: "Payment received. Confirming order..." }));
          await clear();
          navigate("/orders");
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      razorpay.open();
      setPaying(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setPaying(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader title={t("checkout.title", { defaultValue: "Checkout" })} />
        <EmptyState
          title={t("checkout.emptyTitle", { defaultValue: "Nothing to check out" })}
          hint={t("checkout.emptyHint", { defaultValue: "Your cart is empty." })}
        />
        <Link to="/marketplace" className="btn-primary mt-4">
          {t("checkout.browseMarketplace", { defaultValue: "Browse marketplace" })}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title={t("checkout.title", { defaultValue: "Checkout" })}
        description={t("checkout.description", { defaultValue: "Choose an address and pay securely." })}
      />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <h3 className="font-semibold text-forest">
            {t("checkout.deliveryAddress", { defaultValue: "Delivery address" })}
          </h3>
          {addresses.length === 0 && !showNew && (
            <p className="text-sm text-stone-500">
              {t("checkout.noSavedAddresses", { defaultValue: "No saved addresses yet." })}
            </p>
          )}
          <div className="space-y-2">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`card flex cursor-pointer items-start gap-3 !p-4 ${
                  addressId === a.id ? "border-forest ring-2 ring-forest/20" : ""
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  checked={addressId === a.id}
                  onChange={() => setAddressId(a.id)}
                />
                <span>
                  <span className="block text-sm font-semibold text-forest">
                    {a.label}{" "}
                    {a.isDefault && (
                      <span className="badge bg-green-100 text-green-700 ml-1">
                        {t("checkout.defaultBadge", { defaultValue: "Default" })}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm text-stone-500">
                    {a.line1}, {a.city}, {a.state} {a.pincode}
                  </span>
                  {a.phone && <span className="text-xs text-stone-400">{a.phone}</span>}
                </span>
              </label>
            ))}
          </div>
          {showNew ? (
            <form onSubmit={onNewAddress} className="card space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">{t("checkout.addressLabel", { defaultValue: "Label" })}</label>
                  <input
                    className="input"
                    value={newAddr.label}
                    onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t("checkout.phoneLabel", { defaultValue: "Phone" })}</label>
                  <input
                    className="input"
                    value={newAddr.phone}
                    onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">{t("checkout.line1Label", { defaultValue: "Address line 1" })}</label>
                  <input
                    className="input"
                    required
                    value={newAddr.line1}
                    onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t("checkout.cityLabel", { defaultValue: "City" })}</label>
                  <input
                    className="input"
                    required
                    value={newAddr.city}
                    onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t("checkout.stateLabel", { defaultValue: "State" })}</label>
                  <input
                    className="input"
                    required
                    value={newAddr.state}
                    onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t("checkout.pincodeLabel", { defaultValue: "PIN code" })}</label>
                  <input
                    className="input"
                    required
                    pattern="[0-9]{6}"
                    value={newAddr.pincode}
                    onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary" type="submit">
                  {t("checkout.saveAddress", { defaultValue: "Save address" })}
                </button>
                <button className="btn-secondary" type="button" onClick={() => setShowNew(false)}>
                  {t("common:actions.cancel", { defaultValue: "Cancel" })}
                </button>
              </div>
            </form>
          ) : (
            <button className="btn-secondary" onClick={() => setShowNew(true)}>
              {t("checkout.addNewAddress", { defaultValue: "+ Add new address" })}
            </button>
          )}
        </div>

        <div className="card self-start">
          <h3 className="font-semibold text-forest">
            {t("cart.orderSummary", { defaultValue: "Order summary" })}
          </h3>
          <div className="mt-3 space-y-2 text-sm">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-stone-600">
                <span>
                  {i.listing?.title ?? t("cart.item", { defaultValue: "Item" })} × {i.quantityKg}
                  {t("common:units.kg", { defaultValue: "kg" })}
                </span>
                <span>{fmtINR((i.unitPrice || i.listing?.pricePerKg || 0) * i.quantityKg)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-stone-200 pt-2 text-stone-600">
              <span>{t("cart.delivery", { defaultValue: "Delivery" })}</span>
              <span>
                {delivery === 0 ? (
                  <span className="text-green-600 font-semibold">{t("cart.free", { defaultValue: "FREE" })}</span>
                ) : (
                  fmtINR(delivery)
                )}
              </span>
            </div>
            <div className="flex justify-between font-bold text-forest">
              <span>{t("cart.total", { defaultValue: "Total" })}</span>
              <span>{fmtINR(total)}</span>
            </div>
          </div>
          <button className="btn-primary mt-4 w-full" disabled={paying} onClick={onPay}>
            {paying
              ? t("checkout.processing", { defaultValue: "Processing..." })
              : t("checkout.payBtn", { amount: fmtINR(total), defaultValue: `Pay ${fmtINR(total)}` })}
          </button>
          {!RAZORPAY_KEY && (
            <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
              {t("checkout.razorpayWarning", {
                defaultValue: "Razorpay key not configured — order will be created as payment-pending.",
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
