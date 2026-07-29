import "./App.css";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { I18nProvider } from "./context/I18nContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AIChatWidget from "./components/AIChatWidget";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import FarmerDashboard from "./pages/FarmerDashboard";
import SupplierDashboard from "./pages/SupplierDashboard";
import CustomerMarketplace from "./pages/CustomerMarketplace";
import MarketPrices from "./pages/MarketPrices";

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === "farmer") return <Navigate to="/farmer" />;
  if (user.role === "supplier") return <Navigate to="/supplier" />;
  return <Navigate to="/market" />;
}

function Shell() {
  const { user } = useAuth();
  return (
    <div className="App min-h-screen bg-cream">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/home" element={<RoleHome />} />
        <Route path="/farmer" element={<ProtectedRoute role="farmer"><FarmerDashboard /></ProtectedRoute>} />
        <Route path="/supplier" element={<ProtectedRoute role="supplier"><SupplierDashboard /></ProtectedRoute>} />
        <Route path="/market" element={<ProtectedRoute><CustomerMarketplace /></ProtectedRoute>} />
        <Route path="/prices" element={<MarketPrices />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {user && <AIChatWidget />}
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Shell />
          <Toaster position="bottom-center" richColors />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
