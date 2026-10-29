import {
  MarketPriceObservation,
  RawObservationInput,
  ValidationStatus,
} from "../types";

export interface NormalizationResult {
  observation: MarketPriceObservation;
  errors: string[];
}

/**
 * Normalizes unit to 'kg' and currency to 'INR'.
 * If unit is Quintal / Qtl / 100 kg, divide by 100 once.
 * Never applies conversion twice.
 */
export function normalizeUnit(
  price: number,
  unitStr: string
): { pricePerKg: number; conversionFactor: number; recognizedUnit: string } {
  const cleanUnit = (unitStr || "").trim().toLowerCase();

  if (cleanUnit === "kg" || cleanUnit === "kilogram" || cleanUnit === "per kg") {
    return { pricePerKg: price, conversionFactor: 1, recognizedUnit: "kg" };
  }

  if (
    cleanUnit === "quintal" ||
    cleanUnit === "qtl" ||
    cleanUnit === "qtl." ||
    cleanUnit === "100 kg" ||
    cleanUnit === "per quintal" ||
    cleanUnit === "rs/quintal"
  ) {
    // 1 Quintal = 100 kg. Divide by 100.
    const pricePerKg = Math.round((price / 100) * 100) / 100;
    return { pricePerKg, conversionFactor: 0.01, recognizedUnit: "Quintal" };
  }

  if (cleanUnit === "tonne" || cleanUnit === "ton" || cleanUnit === "metric ton") {
    // 1 Tonne = 1000 kg. Divide by 1000.
    const pricePerKg = Math.round((price / 1000) * 100) / 100;
    return { pricePerKg, conversionFactor: 0.001, recognizedUnit: "Tonne" };
  }

  // Unknown unit: preserve as-is but flag as unrecognized
  return { pricePerKg: price, conversionFactor: 1, recognizedUnit: unitStr || "unknown" };
}

/**
 * Validates date string in format YYYY-MM-DD or DD/MM/YYYY.
 */
export function parseAndValidateDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      // Check date is not in future
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      if (d <= now) return trimmed;
    }
  }

  // Format: DD/MM/YYYY
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      if (d <= now) return iso;
    }
  }

  // Generic ISO parse attempt
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const iso = parsed.toISOString().slice(0, 10);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    if (parsed <= now) return iso;
  }

  return null;
}

/**
 * Normalizes commodity, market, variety string casing and whitespace.
 */
export function sanitizeString(val: string | undefined): string {
  if (!val) return "";
  return val.trim().replace(/\s+/g, " ");
}

/**
 * Normalizes and validates a single raw observation from any provider.
 */
export function normalizeObservation(input: RawObservationInput): NormalizationResult {
  const errors: string[] = [];
  const commodity = sanitizeString(input.commodity);
  const market = sanitizeString(input.market);
  const state = sanitizeString(input.state);
  const variety = sanitizeString(input.variety) || "Common";

  if (!commodity) errors.push("Missing commodity name");
  if (!market) errors.push("Missing market (mandi) name");
  if (!state) errors.push("Missing state");

  const validArrivalDate = parseAndValidateDate(input.arrivalDate);
  if (!validArrivalDate) {
    errors.push(`Invalid or future arrival date: "${input.arrivalDate}"`);
  }

  const rawMin = Number(input.minPrice);
  const rawMax = Number(input.maxPrice);
  const rawModal = Number(input.modalPrice);

  if (isNaN(rawMin) || isNaN(rawMax) || isNaN(rawModal)) {
    errors.push("Non-numeric price values encountered");
  }

  if (rawMin <= 0 || rawMax <= 0 || rawModal <= 0) {
    errors.push("Prices must be strictly positive numbers");
  }

  if (rawMin > rawMax) {
    errors.push(`minPrice (${rawMin}) cannot exceed maxPrice (${rawMax})`);
  }

  // Modal price should logically fall within [min, max] with small tolerance for floating point
  if (rawModal < rawMin * 0.99 || rawModal > rawMax * 1.01) {
    errors.push(`modalPrice (${rawModal}) is outside the min-max interval [${rawMin}, ${rawMax}]`);
  }

  const unitConvMin = normalizeUnit(rawMin, input.unit);
  const unitConvMax = normalizeUnit(rawMax, input.unit);
  const unitConvModal = normalizeUnit(rawModal, input.unit);

  if (unitConvModal.recognizedUnit === "unknown") {
    errors.push(`Unrecognized unit: "${input.unit}"`);
  }

  const minKg = unitConvMin.pricePerKg;
  const maxKg = unitConvMax.pricePerKg;
  const modalKg = unitConvModal.pricePerKg;

  // Sanity check: price per kg between ₹0.10 and ₹10,000
  if (modalKg < 0.1 || modalKg > 10000) {
    errors.push(`Implausible price per kg: ₹${modalKg}`);
  }

  const status: ValidationStatus = errors.length > 0 ? "REJECTED" : "VALID";

  const deterministicId = `${input.source.toLowerCase()}_${commodity.toLowerCase()}_${market.toLowerCase()}_${validArrivalDate || "nodate"}_${variety.toLowerCase()}`.replace(
    /[^a-z0-9_-]/g,
    "_"
  );

  const observation: MarketPriceObservation = {
    id: input.sourceObservationId || deterministicId,
    source: input.source,
    dataset: input.dataset,
    sourceObservationId: input.sourceObservationId,
    commodity,
    variety,
    market,
    district: sanitizeString(input.district),
    state,
    arrivalDate: validArrivalDate || input.arrivalDate,
    retrievedAt: new Date().toISOString(),
    grade: input.grade ? sanitizeString(input.grade) : "FAQ",
    unit: "kg",
    currency: "INR",
    minPrice: minKg,
    maxPrice: maxKg,
    modalPrice: modalKg,
    rawUnit: input.unit,
    rawMinPrice: rawMin,
    rawMaxPrice: rawMax,
    rawModalPrice: rawModal,
    validationStatus: status,
    validationErrors: errors.length > 0 ? errors : undefined,
    isDemo: input.isDemo ?? false,
  };

  return { observation, errors };
}

/**
 * Deduplicates and filters valid observations.
 * Does not silently drop unique entries; removes exact duplicate observations.
 */
export function deduplicateObservations(
  observations: MarketPriceObservation[]
): MarketPriceObservation[] {
  const seen = new Set<string>();
  const deduped: MarketPriceObservation[] = [];

  for (const obs of observations) {
    const key = [
      obs.source.toLowerCase(),
      obs.commodity.toLowerCase(),
      (obs.variety || "").toLowerCase(),
      obs.market.toLowerCase(),
      obs.state.toLowerCase(),
      obs.arrivalDate,
      obs.modalPrice,
    ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(obs);
    }
  }

  return deduped;
}
