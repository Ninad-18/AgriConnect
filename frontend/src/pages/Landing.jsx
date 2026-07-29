import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Gavel, Truck, ShieldCheck, Users, Sparkles } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";

const HERO = "https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function Landing() {
  const { t } = useI18n();
  const { user } = useAuth();

  const roles = [
    { icon: Users, title: t("farmer"), desc: "Bid openly on live demand, get AI fair-price help, receive secure digital payments.", color: "bg-forest" },
    { icon: Gavel, title: t("supplier"), desc: "Post procurement needs, compare bids transparently, auto-allocate the best combination.", color: "bg-terracotta" },
    { icon: Truck, title: t("customer"), desc: "Buy verified produce with full origin traceability, track delivery, rate suppliers.", color: "bg-sky" },
  ];
  const steps = [
    { n: "01", t: "Supplier posts a requirement", d: "Product, quantity, minimum grade, delivery date & transport terms." },
    { n: "02", t: "Farmers bid competitively", d: "Quantity, price/kg, grade and produce photos — all visible." },
    { n: "03", t: "Smart selection or manual", d: "Auto-allocate the optimal mix of bids, or pick manually." },
    { n: "04", t: "Track, deliver, pay", d: "Live shipment tracking and secure digital payment on delivery." },
  ];

  return (
    <div className="grain">
      {/* Hero */}
      <section className="relative overflow-hidden bg-forest text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm mb-6">
              <Sparkles className="w-4 h-4 text-ochre" /> {t("brand_tag")}
            </div>
            <h1 className="font-head font-black text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mb-6">
              {t("hero_title")}
            </h1>
            <p className="text-white/80 text-lg max-w-xl mb-8">{t("hero_sub")}</p>
            <div className="flex flex-wrap gap-3">
              <Link to={user ? "/home" : "/register"}>
                <Button size="lg" className="bg-terracotta hover:bg-terracotta/90 text-white gap-2 lift-hover" data-testid="hero-cta">
                  {t("get_started")} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/prices">
                <Button size="lg" variant="outline" className="border-white/30 text-white bg-transparent hover:bg-white/10 hover:text-white gap-2" data-testid="hero-prices">
                  <TrendingUp className="w-4 h-4" /> {t("market_prices")}
                </Button>
              </Link>
            </div>
            <div className="flex gap-8 mt-10">
              {[["₹35", "Real onion price"], ["0", "Middlemen"], ["100%", "Price transparency"]].map(([a, b]) => (
                <div key={b}>
                  <div className="font-head font-black text-3xl text-ochre">{a}</div>
                  <div className="text-white/60 text-sm">{b}</div>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="relative">
            <img src={HERO} alt="Farmer harvesting" className="rounded-2xl w-full h-[440px] object-cover shadow-2xl" />
            <div className="absolute -bottom-5 -left-5 bg-white text-forest rounded-xl p-4 shadow-xl border border-border hidden sm:block">
              <div className="text-xs text-muted-foreground">Highest live bid</div>
              <div className="font-head font-black text-2xl">₹34.50/kg</div>
              <div className="text-xs text-terracotta font-semibold">+ Grade A · 600kg</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Roles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="font-head font-bold text-3xl sm:text-4xl text-forest mb-3">One platform, three roles.</h2>
        <p className="text-muted-foreground text-lg mb-12 max-w-2xl">Built for the entire supply chain — grounded in fairness and traceability.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((r, i) => (
            <motion.div key={r.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-white border border-border rounded-2xl p-8 lift-hover">
              <div className={`w-12 h-12 rounded-xl ${r.color} flex items-center justify-center mb-5`}>
                <r.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-head font-bold text-2xl text-forest mb-2">{r.title}</h3>
              <p className="text-gray-700 leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="bg-sand py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="font-head font-bold text-3xl sm:text-4xl text-forest mb-12">The reverse-bidding workflow</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {steps.map((s, i) => (
              <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="bg-white border border-border rounded-xl p-6">
                <div className="font-head font-black text-4xl text-ochre mb-3">{s.n}</div>
                <h4 className="font-head font-bold text-lg text-forest mb-1">{s.t}</h4>
                <p className="text-sm text-gray-600">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-forest text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <ShieldCheck className="w-10 h-10 text-ochre mx-auto mb-4" />
          <h2 className="font-head font-bold text-3xl sm:text-4xl mb-4">Stop the price exploitation. Start bidding fair.</h2>
          <Link to={user ? "/home" : "/register"}>
            <Button size="lg" className="bg-terracotta hover:bg-terracotta/90 text-white gap-2 lift-hover" data-testid="footer-cta">
              {t("get_started")} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
