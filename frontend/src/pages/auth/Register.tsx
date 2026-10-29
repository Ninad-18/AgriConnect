import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Sprout } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";
import type { RegisterRole } from "@/services/auth";

export default function Register() {
  const { t } = useTranslation(["auth", "common"]);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RegisterRole>("FARMER");
  const [submitting, setSubmitting] = useState(false);

  const roles: { value: RegisterRole; label: string; desc: string }[] = [
    {
      value: "FARMER",
      label: t("register.roles.FARMER.label", { defaultValue: "Farmer" }),
      desc: t("register.roles.FARMER.desc", { defaultValue: "Bid on procurements & win contracts" }),
    },
    {
      value: "SUPPLIER",
      label: t("register.roles.SUPPLIER.label", { defaultValue: "Supplier" }),
      desc: t("register.roles.SUPPLIER.desc", { defaultValue: "Procure, process & sell produce" }),
    },
    {
      value: "CUSTOMER",
      label: t("register.roles.CUSTOMER.label", { defaultValue: "Customer" }),
      desc: t("register.roles.CUSTOMER.desc", { defaultValue: "Shop farm-fresh graded produce" }),
    },
  ];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const input = { name, email, password, phone, location, role };
      await register(input);
      toast.success(t("register.success", { defaultValue: "Account created! Welcome to AgriConnect." }));
      navigate(role === "FARMER" ? "/farmer/profile" : role === "SUPPLIER" ? "/supplier/profile" : "/marketplace");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-2 text-2xl font-bold text-forest">
          <Sprout className="h-7 w-7 text-terracotta" /> {t("common:brand", { defaultValue: "AgriConnect" })}
        </span>
        <p className="mt-2 text-sm text-stone-500">{t("register.title", { defaultValue: "Create your account" })}</p>
      </div>
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">{t("register.roleLabel", { defaultValue: "I am a..." })}</label>
          <div className="grid grid-cols-3 gap-2">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`rounded-lg border px-2 py-2 text-center transition ${
                  role === r.value
                    ? "border-forest bg-forest text-white"
                    : "border-stone-300 bg-white text-stone-600 hover:border-forest"
                }`}
              >
                <span className="block text-sm font-semibold">{r.label}</span>
                <span className={`block text-[11px] ${role === r.value ? "text-emerald-100" : "text-stone-400"}`}>
                  {r.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">{t("register.fullName", { defaultValue: "Full name" })}</label>
          <input
            className="input"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("register.fullNamePlaceholder", { defaultValue: "Ramesh Patil" })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t("register.email", { defaultValue: "Email" })}</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label">{t("register.phone", { defaultValue: "Phone" })}</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("register.phonePlaceholder", { defaultValue: "98765 43210" })}
            />
          </div>
        </div>
        <div>
          <label className="label">{t("register.location", { defaultValue: "Location / District" })}</label>
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("register.locationPlaceholder", { defaultValue: "Nashik, Maharashtra" })}
          />
        </div>
        <div>
          <label className="label">{t("register.password", { defaultValue: "Password" })}</label>
          <input
            className="input"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <button className="btn-primary w-full" type="submit" disabled={submitting}>
          {submitting
            ? t("register.submitting", { defaultValue: "Creating account..." })
            : t("register.submit", { defaultValue: "Create account" })}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-500">
        {t("register.alreadyHaveAccount", { defaultValue: "Already have an account?" })}{" "}
        <Link to="/auth/login" className="font-semibold text-forest hover:underline">
          {t("register.signIn", { defaultValue: "Sign in" })}
        </Link>
      </p>
    </div>
  );
}
