import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Sprout } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";

export default function Login() {
  const { t } = useTranslation(["auth", "common"]);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success(t("login.success", { defaultValue: "Welcome back!" }));
      const stored = localStorage.getItem("agriconnect_user");
      const role: string | undefined = stored ? (JSON.parse(stored) as { role?: string }).role : undefined;
      navigate(role === "FARMER" ? "/farmer" : role === "SUPPLIER" ? "/supplier" : "/marketplace");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-2 text-2xl font-bold text-forest">
          <Sprout className="h-7 w-7 text-terracotta" /> {t("common:brand", { defaultValue: "AgriConnect" })}
        </span>
        <p className="mt-2 text-sm text-stone-500">{t("login.title", { defaultValue: "Sign in to your account" })}</p>
      </div>
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">{t("login.email", { defaultValue: "Email" })}</label>
          <input
            className="input"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t("login.password", { defaultValue: "Password" })}</label>
          <input
            className="input"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn-primary w-full" type="submit" disabled={submitting}>
          {submitting
            ? t("login.submitting", { defaultValue: "Signing in..." })
            : t("login.submit", { defaultValue: "Sign in" })}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-500">
        {t("login.newToAgriConnect", { defaultValue: "New to AgriConnect?" })}{" "}
        <Link to="/auth/register" className="font-semibold text-forest hover:underline">
          {t("login.createAccount", { defaultValue: "Create an account" })}
        </Link>
      </p>
    </div>
  );
}
