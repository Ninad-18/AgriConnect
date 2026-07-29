import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp, ArrowLeft } from "lucide-react";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export default function MarketPrices() {
  const [prices, setPrices] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    api.get("/market/prices").then((r) => { setPrices(r.data); setActive(r.data[0]); });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-forest hover:text-terracotta mb-6 text-sm font-semibold" data-testid="prices-back">
        <ArrowLeft className="w-4 h-4" /> Home
      </Link>
      <div className="flex items-center gap-3 mb-2">
        <TrendingUp className="w-7 h-7 text-terracotta" />
        <h1 className="font-head font-black text-3xl sm:text-4xl text-forest">Live Market Prices</h1>
      </div>
      <p className="text-muted-foreground mb-8">Transparent mandi prices with 30-day trends — so every farmer bids fair.</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-3 max-h-[560px] overflow-y-auto pr-1">
          {prices.map((p) => {
            const up = p.current >= p.avg_30d;
            return (
              <button key={p.id} onClick={() => setActive(p)} data-testid={`price-card-${p.crop}`}
                className={`text-left bg-white border rounded-xl p-4 transition-colors ${active?.id === p.id ? "border-terracotta ring-1 ring-terracotta" : "border-border hover:border-forest/40"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-head font-bold text-forest">{p.crop}</span>
                  <Badge className={up ? "bg-forest text-white" : "bg-terracotta text-white"}>{up ? "▲" : "▼"}</Badge>
                </div>
                <div className="font-head font-black text-2xl text-forest mt-1">₹{p.current}<span className="text-sm font-normal text-muted-foreground">/kg</span></div>
                <div className="text-xs text-muted-foreground mt-1">30d avg ₹{p.avg_30d}</div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {active && (
            <Card className="p-6 border-border">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-head font-black text-2xl text-forest">{active.crop}</h2>
                  <p className="text-muted-foreground text-sm">Price per kg · last 30 days</p>
                </div>
                <div className="flex gap-6">
                  {[["Current", active.current], ["Avg", active.avg_30d], ["Low", active.min_30d], ["High", active.max_30d]].map(([l, v]) => (
                    <div key={l} className="text-right">
                      <div className="text-xs text-muted-foreground">{l}</div>
                      <div className="font-head font-bold text-lg text-forest">₹{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={active.history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6e2d8" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(d) => d.slice(5)} interval={5} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={["dataMin - 2", "dataMax + 2"]} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6e2d8" }} />
                    <Line type="monotone" dataKey="price" stroke="#CC5A37" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
