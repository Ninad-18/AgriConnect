import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Leaf, LogOut, Bell, ShoppingCart, CircleUserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import LanguageSelector from "./LanguageSelector";

interface NavItem {
  to: string;
  isActive: (p: string) => boolean;
  labelKey: string;
}

const navFor: Record<string, NavItem[]> = {
  FARMER: [
    { to: "/farmer", isActive: (p) => p === "/farmer", labelKey: "nav.dashboard" },
    { to: "/farmer/procurements", isActive: (p) => p.startsWith("/farmer/procurements"), labelKey: "nav.procurements" },
    { to: "/farmer/bids", isActive: (p) => p.startsWith("/farmer/bids"), labelKey: "nav.myBids" },
    { to: "/farmer/contracts", isActive: (p) => p.startsWith("/farmer/contracts"), labelKey: "nav.contracts" },
    { to: "/farmer/products", isActive: (p) => p.startsWith("/farmer/products"), labelKey: "nav.products" },
    { to: "/farmer/deliveries", isActive: (p) => p.startsWith("/farmer/deliveries"), labelKey: "nav.deliveries" },
    { to: "/farmer/profile", isActive: (p) => p.startsWith("/farmer/profile"), labelKey: "nav.profile" },
  ],
  SUPPLIER: [
    { to: "/supplier", isActive: (p) => p === "/supplier", labelKey: "nav.dashboard" },
    { to: "/supplier/procurements", isActive: (p) => p.startsWith("/supplier/procurements"), labelKey: "nav.procurements" },
    { to: "/supplier/contracts", isActive: (p) => p.startsWith("/supplier/contracts"), labelKey: "nav.contracts" },
    { to: "/supplier/inventory", isActive: (p) => p.startsWith("/supplier/inventory"), labelKey: "nav.inventory" },
    { to: "/supplier/products", isActive: (p) => p.startsWith("/supplier/products"), labelKey: "nav.products" },
    { to: "/supplier/deliveries", isActive: (p) => p.startsWith("/supplier/deliveries"), labelKey: "nav.deliveries" },
    { to: "/supplier/profile", isActive: (p) => p.startsWith("/supplier/profile"), labelKey: "nav.profile" },
  ],
  CUSTOMER: [
    { to: "/marketplace", isActive: (p) => p === "/marketplace", labelKey: "nav.marketplace" },
    { to: "/orders", isActive: (p) => p.startsWith("/orders"), labelKey: "nav.orders" },
  ],
};

export default function Navbar() {
  const { t } = useTranslation("common");
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const links = user ? navFor[user.role] ?? [] : [];
  const showCart = user?.role === "CUSTOMER";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-forest">
          <Leaf className="h-5 w-5 text-terracotta" />
          <span>{t("brand", { defaultValue: "AgriConnect" })}</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
                l.isActive(pathname)
                  ? "bg-forest text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {t(l.labelKey)}
            </NavLink>
          ))}
          <Link
            to="/market-prices"
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
          >
            {t("nav.marketPrices")}
          </Link>
          {!user && (
            <Link
              to="/marketplace"
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              {t("nav.marketplace")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          {!user ? (
            <>
              <Link to="/auth/login" className="btn-secondary">
                {t("nav.login")}
              </Link>
              <Link to="/auth/register" className="btn-primary">
                {t("nav.register")}
              </Link>
            </>
          ) : (
            <>
              {showCart && (
                <Link
                  to="/cart"
                  className="relative rounded-md p-2 text-stone-600 hover:bg-stone-100"
                  title={t("nav.cart")}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {count > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-bold text-white">
                      {count}
                    </span>
                  )}
                </Link>
              )}
              <Link
                to="/notifications"
                className="rounded-md p-2 text-stone-600 hover:bg-stone-100"
                title={t("nav.notifications")}
              >
                <Bell className="h-5 w-5" />
              </Link>
              <span className="hidden items-center gap-1.5 rounded-md bg-sand px-2.5 py-1.5 text-xs font-medium text-stone-600 sm:flex">
                <CircleUserRound className="h-4 w-4 text-forest" />
                {user.name.split(" ")[0]}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md p-2 text-stone-500 hover:bg-red-50 hover:text-red-600"
                title={t("nav.logout")}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}