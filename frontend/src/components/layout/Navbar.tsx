import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Leaf, LogOut, Bell, ShoppingCart, CircleUserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

const navFor: Record<string, { to: string; isActive: (p: string) => boolean; label: string; cart?: boolean }[]> = {
  FARMER: [
    { to: "/farmer", isActive: (p) => p === "/farmer", label: "Dashboard" },
    { to: "/farmer/procurements", isActive: (p) => p.startsWith("/farmer/procurements"), label: "Procurements" },
    { to: "/farmer/bids", isActive: (p) => p.startsWith("/farmer/bids"), label: "My Bids" },
    { to: "/farmer/contracts", isActive: (p) => p.startsWith("/farmer/contracts"), label: "Contracts" },
    { to: "/farmer/profile", isActive: (p) => p.startsWith("/farmer/profile"), label: "Profile" },
  ],
  SUPPLIER: [
    { to: "/supplier", isActive: (p) => p === "/supplier", label: "Dashboard" },
    { to: "/supplier/procurements", isActive: (p) => p.startsWith("/supplier/procurements"), label: "Procurements" },
    { to: "/supplier/contracts", isActive: (p) => p.startsWith("/supplier/contracts"), label: "Contracts" },
    { to: "/supplier/inventory", isActive: (p) => p.startsWith("/supplier/inventory"), label: "Inventory" },
    { to: "/supplier/products", isActive: (p) => p.startsWith("/supplier/products"), label: "Products" },
    { to: "/supplier/deliveries", isActive: (p) => p.startsWith("/supplier/deliveries"), label: "Deliveries" },
    { to: "/supplier/profile", isActive: (p) => p.startsWith("/supplier/profile"), label: "Profile" },
  ],
  CUSTOMER: [
    { to: "/marketplace", isActive: (p) => p === "/marketplace", label: "Marketplace" },
    { to: "/orders", isActive: (p) => p.startsWith("/orders"), label: "Orders" },
  ],
};

export default function Navbar() {
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
          AgriConnect
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
              {l.label}
            </NavLink>
          ))}
          <Link to="/market-prices" className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100">
            Market Prices
          </Link>
          {!user && (
            <>
              <Link to="/marketplace" className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100">
                Marketplace
              </Link>
              <div className="ml-auto flex items-center gap-2">
                <Link to="/auth/login" className="btn-secondary">
                  Login
                </Link>
                <Link to="/auth/register" className="btn-primary">
                  Register
                </Link>
              </div>
            </>
          )}
        </nav>

        {user && (
          <div className="flex items-center gap-2">
            {showCart && (
              <Link to="/cart" className="relative rounded-md p-2 text-stone-600 hover:bg-stone-100">
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
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
            </Link>
            <span className="hidden items-center gap-1.5 rounded-md bg-sand px-2.5 py-1.5 text-xs font-medium text-stone-600 sm:flex">
              <CircleUserRound className="h-4 w-4 text-forest" />
              {user.name.split(" ")[0]}
            </span>
            <button onClick={handleLogout} className="rounded-md p-2 text-stone-500 hover:bg-red-50 hover:text-red-600" title="Logout">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}