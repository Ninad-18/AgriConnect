import { Navigate, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/types";

const roleHome: Record<Role, string> = {
  FARMER: "/farmer",
  SUPPLIER: "/supplier",
  CUSTOMER: "/marketplace",
};

export default function ProtectedRoute({ role }: { role?: Role }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation("common");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-stone-500">
        {t("actions.loading", { defaultValue: "Loading..." })}
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;
  if (role && user.role !== role) return <Navigate to={roleHome[user.role]} replace />;
  return <Outlet />;
}