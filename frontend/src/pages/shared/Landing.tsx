import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sprout, Truck, ShoppingCart, BarChart3, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Landing() {
  const { t } = useTranslation(["landing", "common"]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const homeForRole = {
    FARMER: "/farmer",
    SUPPLIER: "/supplier",
    CUSTOMER: "/marketplace",
  } as const;

  const features = [
    {
      icon: Sprout,
      title: t("features.smartBidding.title", { defaultValue: "Smart Farmer Bidding" }),
      desc: t("features.smartBidding.desc", {
        defaultValue:
          "Farmers bid openly on verified procurement requests with transparent rankings powered by our smart allocation engine.",
      }),
    },
    {
      icon: Truck,
      title: t("features.b2b.title", { defaultValue: "B2B Procurement & Logistics" }),
      desc: t("features.b2b.desc", {
        defaultValue:
          "Suppliers manage multi-farmer contracts, deliveries, and quality verification with a full audit trail.",
      }),
    },
    {
      icon: ShoppingCart,
      title: t("features.marketplace.title", { defaultValue: "Graded Produce Marketplace" }),
      desc: t("features.marketplace.desc", {
        defaultValue:
          "Customers buy farm-fresh, graded produce directly from suppliers with live inventory and doorstep delivery.",
      }),
    },
    {
      icon: BarChart3,
      title: t("features.prices.title", { defaultValue: "Live Market Prices" }),
      desc: t("features.prices.desc", {
        defaultValue:
          "Real-time and historical trends from AGMARKNET & eNAM help farmers and suppliers price with confidence.",
      }),
    },
  ];

  const marketCrops = [
    [t("snapshot.crops.wheat", { defaultValue: "Wheat" }), "₹2,300/q", "+1.2%"],
    [t("snapshot.crops.tomato", { defaultValue: "Tomato" }), "₹28/kg", "-0.8%"],
    [t("snapshot.crops.onion", { defaultValue: "Onion" }), "₹35/kg", "+2.4%"],
    [t("snapshot.crops.rice", { defaultValue: "Rice (Basmati)" }), "₹4,800/q", "+0.6%"],
  ];

  return (
    <div>
      <section className="bg-forest text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-100">
              <Sprout className="h-3.5 w-3.5" /> {t("badge", { defaultValue: "Fresh from farm to fork" })}
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              {t("headline", { defaultValue: "Connecting farms, procurement and customers —" })}{" "}
              <span className="text-ochre">{t("headlineHighlight", { defaultValue: "end to end." })}</span>
            </h1>
            <p className="mt-4 max-w-lg text-emerald-100/90">
              {t("subhead", {
                defaultValue:
                  "AgriConnect digitises the entire agricultural value chain: transparent open bidding, smart supplier allocation, graded produce commerce, and live market intelligence — all in one platform.",
              })}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <button
                  onClick={() => navigate(homeForRole[user.role])}
                  className="btn-terracotta !px-6 !py-3 !text-base"
                >
                  {t("ctaDashboard", { defaultValue: "Go to my dashboard" })} <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <>
                  <Link to="/auth/register" className="btn-terracotta !px-6 !py-3 !text-base">
                    {t("ctaGetStarted", { defaultValue: "Get started free" })}
                  </Link>
                  <Link
                    to="/auth/login"
                    className="!px-6 !py-3 !text-base border border-white/30 rounded-lg text-white hover:bg-white/10 inline-flex items-center transition"
                  >
                    {t("ctaLogin", { defaultValue: "Login" })}
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden md:block">
            <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur">
              <div className="flex items-center justify-between text-xs text-emerald-200/80">
                <span>{t("snapshot.title", { defaultValue: "Live market snapshot" })}</span>
                <span>{t("snapshot.updated", { defaultValue: "Updated today" })}</span>
              </div>
              {marketCrops.map(([crop, price, change]) => (
                <div key={crop} className="mt-4 flex items-center justify-between rounded-xl bg-white/10 px-4 py-3">
                  <span className="font-medium">{crop}</span>
                  <div className="text-right">
                    <span className="block text-sm font-semibold">{price}</span>
                    <span className={`text-xs ${change.startsWith("+") ? "text-emerald-300" : "text-rose-300"}`}>
                      {change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card hover:shadow-lg transition">
              <f.icon className="h-7 w-7 text-terracotta" />
              <h3 className="mt-3 text-lg font-semibold text-forest">{f.title}</h3>
              <p className="mt-2 text-sm text-stone-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-2xl font-bold text-forest">
            {t("rolesSection.title", { defaultValue: "Meet the marketplace" })}
          </h2>
          <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              {
                t: t("rolesSection.farmers.title", { defaultValue: "Farmers" }),
                d: t("rolesSection.farmers.desc", {
                  defaultValue: "Bid on live demands, win fair contracts, get paid on time.",
                }),
              },
              {
                t: t("rolesSection.suppliers.title", { defaultValue: "Suppliers" }),
                d: t("rolesSection.suppliers.desc", {
                  defaultValue: "Launch procurements, rank bids smartly, manage deliveries & inventory.",
                }),
              },
              {
                t: t("rolesSection.customers.title", { defaultValue: "Customers" }),
                d: t("rolesSection.customers.desc", {
                  defaultValue: "Shop graded farm produce with transparent origin.",
                }),
              },
            ].map((c) => (
              <div key={c.t} className="rounded-xl bg-sand p-5 text-center">
                <h3 className="font-semibold text-forest">{c.t}</h3>
                <p className="mt-1 text-sm text-stone-500">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
