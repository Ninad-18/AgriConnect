import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sprout, Gavel, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { formatError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const ROLES = [
  { key: "farmer", icon: Sprout, label: "Farmer", desc: "I grow & sell produce" },
  { key: "supplier", icon: Gavel, label: "Supplier", desc: "I procure in bulk" },
  { key: "customer", icon: ShoppingBasket, label: "Customer", desc: "I buy produce" },
];

export default function Auth({ mode }) {
  const isLogin = mode === "login";
  const { login, register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "farmer", phone: "", location: "" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = isLogin
        ? await login({ email: form.email, password: form.password })
        : await register(form);
      toast.success(isLogin ? "Welcome back!" : "Account created!");
      navigate(user.role === "farmer" ? "/farmer" : user.role === "supplier" ? "/supplier" : "/market");
    } catch (err) {
      toast.error(formatError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      <div className="hidden lg:block relative bg-forest">
        <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&q=80" alt="farm field"
          className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
          <h2 className="font-head font-black text-4xl leading-tight mb-3">Fair, transparent, farmer-first.</h2>
          <p className="text-white/70 text-lg">Join a marketplace where the real market price is never hidden.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-cream grain">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md">
          <h1 className="font-head font-black text-3xl text-forest mb-1">{isLogin ? t("login") : t("register")}</h1>
          <p className="text-muted-foreground mb-8">{isLogin ? "Access your AgriBid dashboard." : "Create your AgriBid account."}</p>

          <form onSubmit={submit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label className="text-forest">Full name</Label>
                  <Input value={form.name} onChange={set("name")} required data-testid="reg-name" className="mt-1" />
                </div>
                <div>
                  <Label className="text-forest mb-2 block">I am a…</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map((r) => (
                      <button type="button" key={r.key} onClick={() => setForm({ ...form, role: r.key })}
                        data-testid={`role-${r.key}`}
                        className={`p-3 rounded-xl border text-center transition-colors ${form.role === r.key ? "border-terracotta bg-terracotta/10 text-forest" : "border-border bg-white text-gray-600 hover:border-forest/40"}`}>
                        <r.icon className={`w-5 h-5 mx-auto mb-1 ${form.role === r.key ? "text-terracotta" : "text-gray-500"}`} />
                        <div className="text-xs font-bold">{r.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-forest">Phone</Label>
                    <Input value={form.phone} onChange={set("phone")} data-testid="reg-phone" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-forest">Location</Label>
                    <Input value={form.location} onChange={set("location")} placeholder="City, State" data-testid="reg-location" className="mt-1" />
                  </div>
                </div>
              </>
            )}
            <div>
              <Label className="text-forest">Email</Label>
              <Input type="email" value={form.email} onChange={set("email")} required data-testid="auth-email" className="mt-1" />
            </div>
            <div>
              <Label className="text-forest">Password</Label>
              <Input type="password" value={form.password} onChange={set("password")} required data-testid="auth-password" className="mt-1" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-forest hover:bg-forest-light text-white lift-hover" data-testid="auth-submit">
              {loading ? "Please wait…" : isLogin ? t("login") : t("register")}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            {isLogin ? "New to AgriBid? " : "Already have an account? "}
            <Link to={isLogin ? "/register" : "/login"} className="text-terracotta font-semibold" data-testid="auth-switch">
              {isLogin ? t("register") : t("login")}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
