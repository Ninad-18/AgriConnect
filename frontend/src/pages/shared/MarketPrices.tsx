import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CloudSun,
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { fetchPrices, refreshPrice } from "@/services/marketPrices";
import type { MarketPrice } from "@/types";
import { fmtINR, classNames } from "@/lib/format";
import { Spinner, EmptyState } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocalizedProductName, matchesProductSearch } from "@/lib/products";

type TrendPeriod = "7d" | "30d" | "90d";

export default function MarketPrices() {
  const { t } = useTranslation(["shared", "common"]);
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<TrendPeriod>("30d");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const loadData = () => {
    setLoading(true);
    setExpandedCards({});
    fetchPrices()
      .then(setPrices)
      .catch(() => setPrices([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setExpandedCards({});
    try {
      if (selected !== "all") {
        await refreshPrice(selected);
      }
      const data = await fetchPrices();
      setPrices(data);
    } catch {
      // non-critical
    } finally {
      setRefreshing(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const crops = useMemo(() => Array.from(new Set(prices.map((p) => p.crop))).sort(), [prices]);

  const visible = useMemo(() => {
    return prices
      .filter((p) => selected === "all" || p.crop === selected)
      .filter((p) => matchesProductSearch(p.crop, search));
  }, [prices, selected, search]);

  const getPeriodStats = (p: MarketPrice, targetPeriod: TrendPeriod) => {
    const days = targetPeriod === "7d" ? 7 : targetPeriod === "90d" ? 90 : 30;
    const h = p.history ?? [];
    if (h.length < 2) {
      return {
        pct: p.analytics?.percentageChange ?? null,
        up: ((p.analytics?.percentageChange ?? 0) >= 0),
        duration: p.analytics?.trendDurationDays ?? 0,
      };
    }

    const latest = h[h.length - 1];
    const latestDate = new Date(latest.date).getTime();
    const cutoff = latestDate - days * 86400000;
    const slice = h.filter((pt) => new Date(pt.date).getTime() >= cutoff);

    if (slice.length < 2) {
      const first = h[0].price;
      const last = h[h.length - 1].price;
      const pct = first > 0 ? ((last - first) / first) * 100 : null;
      return { pct, up: (pct ?? 0) >= 0, duration: p.analytics?.trendDurationDays ?? 0 };
    }

    const startPrice = slice[0].price;
    const endPrice = slice[slice.length - 1].price;
    const pct = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : null;
    return { pct, up: (pct ?? 0) >= 0, duration: p.analytics?.trendDurationDays ?? 0 };
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title={t("marketPrices.title", { defaultValue: "Market Prices" })}
        description={t("marketPrices.description", {
          defaultValue: "Multi-source market intelligence, verified APMC mandis, historical analytics & weather risk",
        })}
        actions={
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="btn-secondary flex items-center gap-1.5 !py-1.5 !text-xs font-semibold"
            title="Refresh market prices cache"
          >
            <RefreshCw className={classNames("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        }
      />

      {/* Filter and Period Selection Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input max-w-xs text-sm"
            placeholder={t("marketPrices.searchPlaceholder", { defaultValue: "Search crop..." })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input max-w-xs text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="all">{t("marketPrices.allCrops", { defaultValue: "All crops" })}</option>
            {crops.map((c) => (
              <option key={c} value={c}>
                {getLocalizedProductName(c)}
              </option>
            ))}
          </select>
        </div>

        {/* Period Selector Tabs */}
        <div className="inline-flex rounded-lg border border-stone-200 bg-stone-100 p-0.5 text-xs font-medium text-stone-600">
          {(["7d", "30d", "90d"] as TrendPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={classNames(
                "rounded-md px-3 py-1 transition",
                period === p ? "bg-white font-semibold text-forest shadow-sm" : "hover:text-stone-900"
              )}
            >
              {p.toUpperCase()} Trend
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState
          title={t("marketPrices.noData", { defaultValue: "No price data yet" })}
          hint={t("marketPrices.noDataHint", {
            defaultValue: "Price data appears once the market data job runs.",
          })}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => {
            const cardId = p.id || p.crop;
            const stats = getPeriodStats(p, period);
            const isExpanded = Boolean(expandedCards[cardId]);
            const agreement = p.comparison?.status;
            const hasDiscrepancy = agreement === "DISCREPANCY";
            const isSpike = p.anomaly?.isAnomaly;
            const weatherAlert = p.weatherRisk?.alertSeverity && p.weatherRisk.alertSeverity !== "GREEN";

            return (
              <div
                key={p.id}
                className={classNames(
                  "card flex flex-col justify-between transition border",
                  hasDiscrepancy
                    ? "border-amber-300 ring-1 ring-amber-200 bg-amber-50/20"
                    : isSpike
                    ? "border-red-300 ring-1 ring-red-200 bg-red-50/10"
                    : "border-stone-200"
                )}
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-forest">
                        {getLocalizedProductName(p.crop)}
                      </h3>
                      <p className="text-xs text-stone-500">
                        {p.variety ? `${p.variety} • ` : ""}
                        {p.market ? `${p.market}${p.state ? `, ${p.state}` : ""}` : "Verified APMC Mandi"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="badge bg-stone-100 text-stone-600 font-medium">
                        {t("common:units.perUnit", { unit: p.unit, defaultValue: `per ${p.unit}` })}
                      </span>
                      {p.isDemo ? (
                        <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
                          Benchmark Snapshot
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                          <ShieldCheck className="h-3 w-3" />
                          {p.source.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Price & Trend */}
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                        Official Modal Price
                      </p>
                      <p className="text-3xl font-extrabold text-forest">
                        {fmtINR(p.modalPrice ?? p.current)}
                      </p>
                    </div>

                    {stats.pct != null && (
                      <div className="text-right">
                        <p
                          className={classNames(
                            "flex items-center justify-end gap-0.5 text-xs font-bold",
                            stats.up ? "text-green-600" : "text-red-500"
                          )}
                        >
                          {stats.up ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {stats.up ? "+" : ""}
                          {stats.pct.toFixed(1)}% ({period})
                        </p>
                        {stats.duration > 1 && (
                          <p className="text-[10px] text-stone-400">
                            {stats.duration}d continuous {stats.up ? "rise" : "fall"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Min / Avg / Max 3-column stats */}
                  <div className="mt-4 grid grid-cols-3 divide-x divide-stone-200 rounded-lg bg-stone-50 p-2 text-center text-xs text-stone-600">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase">
                        {t("marketPrices.min", { defaultValue: "Min" })}
                      </span>
                      <b className="text-stone-800">
                        {p.min30d != null || p.minPrice != null
                          ? fmtINR(p.min30d ?? p.minPrice ?? 0)
                          : "-"}
                      </b>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase">
                        {t("marketPrices.avg", { defaultValue: "Avg" })}
                      </span>
                      <b className="text-stone-800">
                        {p.avg30d != null || p.analytics?.avgPrice != null
                          ? fmtINR(p.avg30d ?? p.analytics?.avgPrice ?? 0)
                          : "-"}
                      </b>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase">
                        {t("marketPrices.max", { defaultValue: "Max" })}
                      </span>
                      <b className="text-stone-800">
                        {p.max30d != null || p.maxPrice != null
                          ? fmtINR(p.max30d ?? p.maxPrice ?? 0)
                          : "-"}
                      </b>
                    </div>
                  </div>

                  {/* Badges / Signals Row */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {/* Cross-Source Agreement Badge */}
                    {agreement && (
                      <span
                        className={classNames(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          agreement === "HIGH_AGREEMENT"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : agreement === "MODERATE_AGREEMENT"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : agreement === "DISCREPANCY"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-stone-100 text-stone-600 border border-stone-200"
                        )}
                      >
                        {agreement === "HIGH_AGREEMENT" && "✓ High Source Agreement"}
                        {agreement === "MODERATE_AGREEMENT" && "ℹ Moderate Agreement"}
                        {agreement === "DISCREPANCY" && "⚠ Discrepancy Notice"}
                        {agreement === "UNAVAILABLE" && "Single Source Verified"}
                      </span>
                    )}

                    {/* Anomaly Badge */}
                    {isSpike && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200">
                        <AlertTriangle className="h-3 w-3" />
                        {p.anomaly?.type === "SPIKE" ? "Price Spike" : "Price Drop"}
                      </span>
                    )}

                    {/* Weather Advisory Badge */}
                    {weatherAlert && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
                        <CloudSun className="h-3 w-3" />
                        Weather Risk: {p.weatherRisk?.potentialSupplyRisk}
                      </span>
                    )}

                    {/* Stale Data Indicator */}
                    {p.stale && (
                      <span className="inline-flex items-center rounded-full bg-stone-200 px-2 py-0.5 text-[11px] text-stone-700">
                        Stale Data
                      </span>
                    )}
                  </div>

                  {/* Discrepancy Warning Notice if triggered */}
                  {hasDiscrepancy && p.comparison?.discrepancyWarning && (
                    <div className="mt-2.5 rounded-md bg-amber-50 p-2 text-xs text-amber-800 border border-amber-200">
                      <div className="flex gap-1.5">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        <p>{p.comparison.discrepancyWarning}</p>
                      </div>
                    </div>
                  )}

                  {/* Weighted Estimate Note if multiple independent sources */}
                  {p.comparison?.weightedEstimate != null && (
                    <p className="mt-2 text-[11px] text-stone-500">
                      Weighted multi-source estimate:{" "}
                      <b className="text-stone-700">{fmtINR(p.comparison.weightedEstimate)}</b>
                      <span className="text-[10px] text-stone-400"> (based on freshness & reliability)</span>
                    </p>
                  )}
                </div>

                {/* Expandable Intelligence Drawer */}
                <div className="mt-4 border-t border-stone-100 pt-3">
                  <button
                    onClick={() => toggleExpand(cardId)}
                    className="flex w-full items-center justify-between text-xs font-semibold text-forest hover:text-forest/80"
                  >
                    <span>{isExpanded ? "Hide Intelligence Details" : "View Intelligence Details"}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 text-xs text-stone-600">
                      {/* Multi-Source Comparison Breakdown */}
                      {p.comparison && p.comparison.observedSources.length > 0 && (
                        <div className="rounded border border-stone-200 bg-white p-2.5">
                          <p className="font-semibold text-stone-800 mb-1.5 flex items-center gap-1">
                            <Info className="h-3.5 w-3.5 text-forest" />
                            Source Comparison & Provenance
                          </p>
                          <div className="space-y-1 divide-y divide-stone-100">
                            {p.comparison.observedSources.map((s, idx) => (
                              <div key={idx} className="flex justify-between items-center py-1">
                                <div>
                                  <span className="font-medium capitalize text-stone-800">{s.source}</span>
                                  <span className="text-[10px] text-stone-400 block">{s.market || "APMC"} ({s.arrivalDate})</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-stone-800">{fmtINR(s.modalPrice)}</span>
                                  <span className="text-[10px] text-stone-400 block">
                                    Range: {fmtINR(s.minPrice)}-{fmtINR(s.maxPrice)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Historical Analytics Details */}
                      {p.analytics && (
                        <div className="rounded border border-stone-200 bg-white p-2.5">
                          <p className="font-semibold text-stone-800 mb-1">Historical Analytics</p>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-stone-400 block">Price Volatility</span>
                              <span className="font-semibold text-stone-700">
                                {p.analytics.volatilityPct != null ? `${p.analytics.volatilityPct}% CV` : "Insufficient data"}
                              </span>
                            </div>
                            <div>
                              <span className="text-stone-400 block">Consecutive Trend</span>
                              <span className="font-semibold text-stone-700">
                                {p.analytics.trendDurationDays} days
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Weather Risk Context */}
                      {p.weatherRisk && p.weatherRisk.available && (
                        <div className="rounded border border-stone-200 bg-white p-2.5">
                          <p className="font-semibold text-stone-800 mb-1 flex items-center gap-1">
                            <CloudSun className="h-3.5 w-3.5 text-amber-600" />
                            Weather & Supply Risk
                          </p>
                          <p className="text-[11px] text-stone-700">{p.weatherRisk.alertDescription}</p>
                          <p className="mt-1 text-[10px] text-stone-400 italic">
                            {p.weatherRisk.disclaimer}
                          </p>
                        </div>
                      )}

                      {/* Seasonal / Festival Factors */}
                      {p.seasonalContext && p.seasonalContext.length > 0 && (
                        <div className="rounded border border-stone-200 bg-white p-2.5">
                          <p className="font-semibold text-stone-800 mb-1 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-forest" />
                            Seasonal Context
                          </p>
                          {p.seasonalContext.map((fac, idx) => (
                            <div key={idx} className="text-[11px] text-stone-600">
                              <span className="font-medium text-stone-700">{fac.event}: </span>
                              <span>{fac.description}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Provenance Footer */}
                      <div className="text-[10px] text-stone-400 pt-1 border-t border-stone-100 flex justify-between">
                        <span>Unit: ₹ per {p.unit} (Quintal ÷ 100)</span>
                        <span>Date: {p.arrivalDate || "Latest"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
