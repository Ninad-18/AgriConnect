import { useEffect, useMemo, useState } from "react";
import { fetchPrices } from "@/services/marketPrices";
import type { MarketPrice } from "@/types";
import { fmtINR, classNames } from "@/lib/format";
import { Spinner, EmptyState } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function MarketPrices() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPrices()
      .then(setPrices)
      .catch(() => setPrices([]))
      .finally(() => setLoading(false));
  }, []);

  const crops = useMemo(() => Array.from(new Set(prices.map((p) => p.crop))).sort(), [prices]);

  const visible = useMemo(() => {
    return prices
      .filter((p) => selected === "all" || p.crop === selected)
      .filter((p) => p.crop.toLowerCase().includes(search.toLowerCase()));
  }, [prices, selected, search]);

  const changePct = (p: MarketPrice) => {
    const h = p.history ?? [];
    if (h.length < 2) return null;
    const first = h[0].price;
    const last = h[h.length - 1].price;
    if (!first) return null;
    return ((last - first) / first) * 100;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader title="Market Prices" description="Live and historical prices from AGMARKNET & eNAM" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs"
          placeholder="Search crop..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-xs" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="all">All crops</option>
          {crops.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState title="No price data yet" hint="Price data appears once the market data job runs." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => {
            const change = changePct(p);
            const up = (change ?? 0) >= 0;
            return (
              <div key={p.id} className="card">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-forest">{p.crop}</h3>
                  <span className="badge bg-stone-100 text-stone-600">per {p.unit}</span>
                </div>
                <p className="mt-2 text-3xl font-bold text-forest">{fmtINR(p.current)}</p>
                {change != null && (
                  <p className={classNames("mt-1 text-xs font-semibold", up ? "text-green-600" : "text-red-500")}>
                    {up ? "▲" : "▼"} {change.toFixed(1)}% (30d)
                  </p>
                )}
                <div className="mt-3 flex gap-4 text-xs text-stone-500">
                  <span>
                    Min <b>{p.min30d != null ? fmtINR(p.min30d) : "-"}</b>
                  </span>
                  <span>
                    Avg <b>{p.avg30d != null ? fmtINR(p.avg30d) : "-"}</b>
                  </span>
                  <span>
                    Max <b>{p.max30d != null ? fmtINR(p.max30d) : "-"}</b>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}