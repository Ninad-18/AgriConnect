import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeObservation,
  normalizeUnit,
  parseAndValidateDate,
  deduplicateObservations,
} from "../src/modules/market-prices/normalization/normalizer";
import {
  areSourcesIndependent,
  calculateFreshnessFactor,
  compareCrossSourcePrices,
  DEFAULT_SOURCE_CONFIGS,
} from "../src/modules/market-prices/comparison/priceComparison";
import {
  calculateConsecutiveTrendDuration,
  calculateVolatility,
  computeHistoricalAnalytics,
  determineTrendDirection,
} from "../src/modules/market-prices/analytics/historicalAnalytics";
import {
  detectPriceAnomaly,
  DEFAULT_ANOMALY_THRESHOLDS,
} from "../src/modules/market-prices/anomalies/anomalyDetector";
import { assessWeatherRisk } from "../src/modules/market-prices/weather/weatherRisk.service";
import { getSeasonalFactors } from "../src/modules/market-prices/calendar/seasonalCalendar";
import {
  buildHistoryCacheKey,
  buildPriceCacheKey,
} from "../src/modules/market-prices/cache/priceCache";
import { AgmarknetProvider } from "../src/modules/market-prices/providers/agmarknet.provider";
import { EnamProvider } from "../src/modules/market-prices/providers/enam.provider";
import { SnapshotProvider } from "../src/modules/market-prices/providers/snapshot.provider";
import { MarketPriceObservation } from "../src/modules/market-prices/types";

// ── 1. Unit Normalization & Quintal Conversion Tests ───────────────────

test("normalizeUnit correctly converts Quintal to kg by dividing by 100 once", () => {
  const quintalPrice = 3500; // ₹3500/Quintal = ₹35/kg
  const result = normalizeUnit(quintalPrice, "Quintal");
  assert.equal(result.pricePerKg, 35.0);
  assert.equal(result.conversionFactor, 0.01);
  assert.equal(result.recognizedUnit, "Quintal");

  // Secondary aliases
  assert.equal(normalizeUnit(2800, "qtl").pricePerKg, 28.0);
  assert.equal(normalizeUnit(2200, "100 kg").pricePerKg, 22.0);
});

test("normalizeUnit preserves kg without double conversion", () => {
  const kgPrice = 35.0;
  const result = normalizeUnit(kgPrice, "kg");
  assert.equal(result.pricePerKg, 35.0);
  assert.equal(result.conversionFactor, 1.0);
  assert.equal(result.recognizedUnit, "kg");
});

test("normalizeUnit flags unknown units", () => {
  const result = normalizeUnit(50, "crates");
  assert.equal(result.recognizedUnit, "crates");
  assert.equal(result.pricePerKg, 50);
});

// ── 2. Observation Validation & Sanitization Tests ───────────────────

test("normalizeObservation accepts valid AGMARKNET mandi observation", () => {
  const result = normalizeObservation({
    source: "agmarknet",
    commodity: "Onion",
    variety: "Red",
    market: "Lasalgaon",
    district: "Nashik",
    state: "Maharashtra",
    arrivalDate: "2026-10-25",
    unit: "Quintal",
    minPrice: 2800,
    maxPrice: 3800,
    modalPrice: 3400,
  });

  assert.equal(result.observation.validationStatus, "VALID");
  assert.equal(result.errors.length, 0);
  assert.equal(result.observation.modalPrice, 34.0);
  assert.equal(result.observation.minPrice, 28.0);
  assert.equal(result.observation.maxPrice, 38.0);
  assert.equal(result.observation.rawUnit, "Quintal");
  assert.equal(result.observation.unit, "kg");
});

test("normalizeObservation rejects invalid prices (min > max or modal out of range)", () => {
  const inverted = normalizeObservation({
    source: "agmarknet",
    commodity: "Tomato",
    market: "Pune",
    state: "Maharashtra",
    arrivalDate: "2026-10-25",
    unit: "Quintal",
    minPrice: 4000,
    maxPrice: 2000, // inverted
    modalPrice: 3000,
  });
  assert.equal(inverted.observation.validationStatus, "REJECTED");
  assert.ok(inverted.errors.some((e) => e.includes("cannot exceed maxPrice")));

  const outOfRange = normalizeObservation({
    source: "agmarknet",
    commodity: "Tomato",
    market: "Pune",
    state: "Maharashtra",
    arrivalDate: "2026-10-25",
    unit: "Quintal",
    minPrice: 2000,
    maxPrice: 3000,
    modalPrice: 4500, // modal higher than max
  });
  assert.equal(outOfRange.observation.validationStatus, "REJECTED");
  assert.ok(outOfRange.errors.some((e) => e.includes("outside the min-max interval")));
});

test("parseAndValidateDate rejects future dates and parses multiple formats", () => {
  assert.equal(parseAndValidateDate("2026-10-20"), "2026-10-20");
  assert.equal(parseAndValidateDate("20/10/2026"), "2026-10-20");
  assert.equal(parseAndValidateDate("2099-01-01"), null); // future date rejected
  assert.equal(parseAndValidateDate("not-a-date"), null);
});

// ── 3. Duplicate Handling Tests ─────────────────────────────────────────

test("deduplicateObservations removes identical records without dropping distinct observations", () => {
  const base: MarketPriceObservation = {
    id: "obs-1",
    source: "agmarknet",
    commodity: "Onion",
    variety: "Red",
    market: "Lasalgaon",
    state: "Maharashtra",
    arrivalDate: "2026-10-25",
    retrievedAt: new Date().toISOString(),
    minPrice: 28,
    maxPrice: 38,
    modalPrice: 34,
    unit: "kg",
    currency: "INR",
    validationStatus: "VALID",
  };

  const dup = { ...base, id: "obs-1-copy" };
  const differentMarket = { ...base, id: "obs-2", market: "Azadpur", state: "Delhi" };

  const deduped = deduplicateObservations([base, dup, differentMarket]);
  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].market, "Lasalgaon");
  assert.equal(deduped[1].market, "Azadpur");
});

// ── 4. Cross-Source Comparison & Discrepancy Warning Tests ─────────────

const mockObs = (overrides: Partial<MarketPriceObservation>): MarketPriceObservation => ({
  id: "test-" + Math.random(),
  source: "agmarknet",
  commodity: "Onion",
  variety: "Red",
  market: "Lasalgaon",
  state: "Maharashtra",
  arrivalDate: "2026-10-25",
  retrievedAt: new Date().toISOString(),
  minPrice: 30,
  maxPrice: 36,
  modalPrice: 33,
  unit: "kg",
  currency: "INR",
  validationStatus: "VALID",
  ...overrides,
});

test("cross-source comparison identifies single source as UNAVAILABLE comparison", () => {
  const primary = mockObs({ source: "agmarknet", modalPrice: 35 });
  const comp = compareCrossSourcePrices(primary, []);
  assert.equal(comp.status, "UNAVAILABLE");
  assert.equal(comp.primaryModalPrice, 35);
  assert.equal(comp.weightedEstimate, undefined);
  assert.equal(comp.observedSources.length, 1);
});

test("cross-source comparison detects HIGH_AGREEMENT when sources are close", () => {
  const primary = mockObs({ source: "agmarknet", modalPrice: 35.0 });
  const secondary = mockObs({ source: "spot_mandi", modalPrice: 35.5 });

  const comp = compareCrossSourcePrices(primary, [secondary]);
  assert.equal(comp.status, "HIGH_AGREEMENT");
  assert.ok(comp.spreadPct <= 5);
  assert.ok(comp.weightedEstimate != null);
  assert.equal(comp.discrepancyWarning, undefined);
});

test("cross-source comparison issues warning on material DISCREPANCY (>15%)", () => {
  const primary = mockObs({ source: "agmarknet", modalPrice: 30.0 });
  const secondary = mockObs({ source: "spot_mandi", modalPrice: 42.0 }); // 40% higher

  const comp = compareCrossSourcePrices(primary, [secondary]);
  assert.equal(comp.status, "DISCREPANCY");
  assert.ok(comp.spreadPct > 15);
  assert.ok(comp.discrepancyWarning != null);
  assert.ok(comp.discrepancyWarning.includes("Material price discrepancy detected"));
});

test("areSourcesIndependent correctly prevents mirrored datasets from counting as independent", () => {
  assert.equal(areSourcesIndependent("agmarknet", "enam"), false);
  assert.equal(areSourcesIndependent("agmarknet", "spot_mandi"), true);
  assert.equal(areSourcesIndependent("agmarknet", "agmarknet"), false);
});

// ── 5. Historical Price Analytics Tests ─────────────────────────────────

test("computeHistoricalAnalytics handles insufficient data safely", () => {
  const single = computeHistoricalAnalytics([{ date: "2026-10-20", price: 30 }]);
  assert.equal(single.status, "INSUFFICIENT_DATA");
  assert.equal(single.trend7d, "INSUFFICIENT_DATA");
  assert.equal(single.trend30d, "INSUFFICIENT_DATA");
  assert.equal(single.volatilityPct, null);
  assert.equal(single.percentageChange, null);

  const empty = computeHistoricalAnalytics([]);
  assert.equal(empty.status, "INSUFFICIENT_DATA");
});

test("computeHistoricalAnalytics accurately calculates percentage change and stats", () => {
  const points = [
    { date: "2026-10-01", price: 20 },
    { date: "2026-10-10", price: 22 },
    { date: "2026-10-20", price: 24 },
    { date: "2026-10-30", price: 25 },
  ];
  const analytics = computeHistoricalAnalytics(points, 30);
  assert.equal(analytics.status, "CALCULATED");
  assert.equal(analytics.minPrice, 20);
  assert.equal(analytics.maxPrice, 25);
  assert.equal(analytics.avgPrice, 22.75);
  assert.equal(analytics.latestModalPrice, 25);
  assert.equal(analytics.absoluteChange, 5.0);
  assert.equal(analytics.percentageChange, 25.0); // (25-20)/20 * 100
  assert.equal(analytics.trend30d, "UP");
  assert.ok(analytics.volatilityPct != null && analytics.volatilityPct > 0);
});

test("calculateConsecutiveTrendDuration distinguishes net change from continuous monotonic trend", () => {
  // A 30-day net increase with zigzag movements should NOT be reported as 30 days upward
  const zigzag = [
    { date: "2026-10-01", price: 20 },
    { date: "2026-10-02", price: 22 },
    { date: "2026-10-03", price: 21 }, // dip
    { date: "2026-10-04", price: 23 },
    { date: "2026-10-05", price: 24 },
  ];
  const duration = calculateConsecutiveTrendDuration(zigzag);
  assert.equal(duration, 2); // Only last 2 days (21 -> 23 -> 24) are strictly upward!
});

// ── 6. Robust Anomaly Detection (MAD) Tests ─────────────────────────────

test("detectPriceAnomaly detects price spike using Median Absolute Deviation", () => {
  // 10 historical prices around 30
  const history = [
    { date: "2026-10-01", price: 30 },
    { date: "2026-10-02", price: 31 },
    { date: "2026-10-03", price: 29 },
    { date: "2026-10-04", price: 30 },
    { date: "2026-10-05", price: 32 },
    { date: "2026-10-06", price: 30 },
    { date: "2026-10-07", price: 31 },
    { date: "2026-10-08", price: 29 },
    { date: "2026-10-09", price: 30 },
  ];

  // Normal price
  const normalCheck = detectPriceAnomaly(31, history);
  assert.equal(normalCheck.severity, "NORMAL");
  assert.equal(normalCheck.isAnomaly, false);

  // Severe sudden spike (e.g. ₹60 vs baseline ₹30)
  const spikeCheck = detectPriceAnomaly(60, history);
  assert.equal(spikeCheck.severity, "ANOMALY");
  assert.equal(spikeCheck.type, "SPIKE");
  assert.equal(spikeCheck.isAnomaly, true);
  assert.ok(spikeCheck.score > DEFAULT_ANOMALY_THRESHOLDS.anomalyZScore);

  // Severe sudden crash (e.g. ₹12 vs baseline ₹30)
  const crashCheck = detectPriceAnomaly(12, history);
  assert.equal(crashCheck.severity, "ANOMALY");
  assert.equal(crashCheck.type, "CRASH");
  assert.equal(crashCheck.isAnomaly, true);
});

test("detectPriceAnomaly safely requires minimum samples", () => {
  const sparse = [{ date: "2026-10-01", price: 30 }];
  const check = detectPriceAnomaly(50, sparse);
  assert.equal(check.severity, "NORMAL");
  assert.equal(check.isAnomaly, false);
  assert.ok(check.explanation?.includes("Insufficient historical baseline"));
});

// ── 7. Weather Risk Monitoring Tests ───────────────────────────────────

test("assessWeatherRisk generates decoupled alerts without mutating prices", async () => {
  const onionRisk = await assessWeatherRisk("Onion", "Maharashtra");
  assert.equal(onionRisk.available, true);
  assert.ok(onionRisk.affectedCrops.includes("Onion"));
  assert.ok(onionRisk.disclaimer.includes("Weather alerts represent potential supply or logistics risks"));
  assert.ok(["GREEN", "YELLOW", "ORANGE", "RED"].includes(onionRisk.alertSeverity));

  const wheatRisk = await assessWeatherRisk("Wheat", "Punjab");
  assert.equal(wheatRisk.region, "Punjab");
  assert.equal(wheatRisk.potentialSupplyRisk, "NONE");
});

// ── 8. Seasonal & Festival Calendar Tests ──────────────────────────────

test("getSeasonalFactors labels signals as potential demand/supply without declaring confirmed prices", () => {
  const sugarcaneFactors = getSeasonalFactors("Sugarcane", 10); // October (Diwali)
  assert.ok(sugarcaneFactors.length > 0);
  assert.equal(sugarcaneFactors[0].signal, "POTENTIAL_DEMAND_INCREASE");
  assert.ok(sugarcaneFactors[0].description.includes("Signal: POTENTIAL DEMAND INCREASE"));
});

// ── 9. Cache Key Builders & Provider Architecture Tests ────────────────

test("buildPriceCacheKey produces deterministic, stable keys", () => {
  const key1 = buildPriceCacheKey({ crop: "Onion", market: "Lasalgaon APMC", state: "Maharashtra" });
  const key2 = buildPriceCacheKey({ crop: "onion", market: "lasalgaon apmc", state: "maharashtra" });
  assert.equal(key1, key2);
  assert.equal(key1, "market-prices:summary:onion:lasalgaon_apmc:maharashtra:latest:kg");

  const histKey = buildHistoryCacheKey("Tomato", 30);
  assert.equal(histKey, "market-prices:history:tomato:30");
});

test("providers handle availability and limitations transparently", async () => {
  const agmarknet = new AgmarknetProvider({ apiKey: "" });
  assert.equal(await agmarknet.isAvailable(), false);

  const enam = new EnamProvider({ apiUrl: "", apiKey: "" });
  assert.equal(await enam.isAvailable(), false);
  assert.ok(enam.getUnavailableReason().includes("enam.gov.in/web/dashboard/agmarknet"));

  const snapshot = new SnapshotProvider();
  assert.equal(await snapshot.isAvailable(), true);
  const snapDaily = await snapshot.fetchDailyPrices({ crop: "Onion" });
  assert.ok(snapDaily.length > 0);
  assert.equal(snapDaily[0].isDemo, true);
  assert.equal(snapDaily[0].commodity, "Onion");
  assert.equal(snapDaily[0].unit, "kg");
});
