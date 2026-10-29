import { Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Navbar from "./components/layout/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/shared/Landing";
import MarketPrices from "./pages/shared/MarketPrices";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import FarmerProfile from "./pages/farmer/FarmerProfile";
import FarmerProcurements from "./pages/farmer/ProcurementList";
import SubmitBid from "./pages/farmer/SubmitBid";
import FarmerBids from "./pages/farmer/MyBids";
import FarmerContracts from "./pages/farmer/MyContracts";
import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import SupplierProfile from "./pages/supplier/SupplierProfile";
import CreateProcurement from "./pages/supplier/CreateProcurement";
import ManageProcurements from "./pages/supplier/ManageProcurements";
import ProcurementDetail from "./pages/supplier/ProcurementDetail";
import SupplierContracts from "./pages/supplier/Contracts";
import SupplierInventory from "./pages/supplier/Inventory";
import SupplierProducts from "./pages/supplier/Products";
import SupplierDeliveries from "./pages/supplier/Deliveries";
import Marketplace from "./pages/customer/Marketplace";
import ProductDetail from "./pages/customer/ProductDetail";
import CartPage from "./pages/customer/CartPage";
import Checkout from "./pages/customer/Checkout";
import CustomerOrders from "./pages/customer/Orders";
import Notifications from "./pages/shared/Notifications";

export default function App() {
  const { user } = useAuth();
  const { t } = useTranslation("common");

  return (
    <CartProvider userId={user?.id}>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/market-prices" element={<MarketPrices />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />

            <Route element={<ProtectedRoute role="FARMER" />}>
              <Route path="/farmer" element={<FarmerDashboard />} />
              <Route path="/farmer/profile" element={<FarmerProfile />} />
              <Route path="/farmer/procurements" element={<FarmerProcurements />} />
              <Route path="/farmer/procurements/:id/bid" element={<SubmitBid />} />
              <Route path="/farmer/bids" element={<FarmerBids />} />
              <Route path="/farmer/contracts" element={<FarmerContracts />} />
            </Route>

            <Route element={<ProtectedRoute role="SUPPLIER" />}>
              <Route path="/supplier" element={<SupplierDashboard />} />
              <Route path="/supplier/profile" element={<SupplierProfile />} />
              <Route path="/supplier/procurements/new" element={<CreateProcurement />} />
              <Route path="/supplier/procurements" element={<ManageProcurements />} />
              <Route path="/supplier/procurements/:id" element={<ProcurementDetail />} />
              <Route path="/supplier/contracts" element={<SupplierContracts />} />
              <Route path="/supplier/inventory" element={<SupplierInventory />} />
              <Route path="/supplier/products" element={<SupplierProducts />} />
              <Route path="/supplier/deliveries" element={<SupplierDeliveries />} />
            </Route>

            <Route element={<ProtectedRoute role="CUSTOMER" />}>
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<CustomerOrders />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/notifications" element={<Notifications />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
          {t("footer", { defaultValue: "AgriConnect — connecting Indian farmers, suppliers and customers." })}
        </footer>
      </div>
    </CartProvider>
  );
}