export type ValidationStatus = "VALID" | "SUSPECT" | "REJECTED";

export interface SourceProvenance {
  provider: string;
  dataset?: string;
  sourceObservationId?: string;
  retrievalTime: string;
  reportingDate: string;
  rawUnit: string;
  rawMinPrice?: number;
  rawMaxPrice?: number;
  rawModalPrice?: number;
  conversionFactor: number;
}

export interface MarketPriceObservation {
  id: string;
  source: string; // e.g. "agmarknet", "enam", "spot_mandi", "snapshot"
  dataset?: string;
  sourceObservationId?: string;
  commodity: string;
  variety?: string;
  market: string;
  district?: string;
  state: string;
  arrivalDate: string; // YYYY-MM-DD
  retrievedAt: string;
  grade?: string;
  unit: "kg";
  currency: "INR";
  minPrice: number; // INR per kg
  maxPrice: number; // INR per kg
  modalPrice: number; // INR per kg
  rawUnit?: string;
  rawMinPrice?: number;
  rawMaxPrice?: number;
  rawModalPrice?: number;
  validationStatus: ValidationStatus;
  validationErrors?: string[];
  isDemo?: boolean;
}

export interface RawObservationInput {
  source: string;
  dataset?: string;
  sourceObservationId?: string;
  commodity: string;
  variety?: string;
  market: string;
  district?: string;
  state: string;
  arrivalDate: string;
  grade?: string;
  unit: string;
  currency?: string;
  minPrice: number | string;
  maxPrice: number | string;
  modalPrice: number | string;
  isDemo?: boolean;
}

export type AgreementStatus =
  | "UNAVAILABLE" // only 1 source available
  | "HIGH_AGREEMENT" // divergence <= 5%
  | "MODERATE_AGREEMENT" // divergence between 5% and 15%
  | "DISCREPANCY"; // divergence > 15%

export interface SourceComparisonItem {
  source: string;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  arrivalDate: string;
  market: string;
  variety?: string;
  weight: number;
  isIndependent: boolean;
}

export interface CrossSourceComparison {
  status: AgreementStatus;
  primarySource: string;
  primaryModalPrice: number;
  observedSources: SourceComparisonItem[];
  minObserved: number;
  maxObserved: number;
  spreadPct: number;
  weightedEstimate?: number;
  discrepancyWarning?: string;
  notes?: string;
}

export type TrendDirection = "UP" | "DOWN" | "STABLE" | "INSUFFICIENT_DATA";

export interface HistoricalAnalytics {
  observationCount: number;
  windowDays: number;
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
  latestModalPrice: number | null;
  earliestModalPrice: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  trend7d: TrendDirection;
  trend30d: TrendDirection;
  trend90d: TrendDirection;
  volatilityPct: number | null; // coefficient of variation (%)
  trendDurationDays: number; // consecutive days in current direction
  status: "CALCULATED" | "INSUFFICIENT_DATA";
}

export type AnomalySeverity = "NORMAL" | "WATCH" | "ANOMALY";
export type AnomalyType = "NONE" | "RECORD_DISCREPANCY" | "SPIKE" | "CRASH";

export interface AnomalyResult {
  severity: AnomalySeverity;
  type: AnomalyType;
  score: number; // Modified Z-Score / MAD score
  medianBaseline: number | null;
  mad: number | null;
  isAnomaly: boolean;
  explanation?: string;
  evidence?: {
    latestPrice: number;
    baselinePrice: number;
    deviationPct: number;
    sampleSize: number;
  };
}

export type WeatherAlertSeverity = "GREEN" | "YELLOW" | "ORANGE" | "RED";
export type SupplyRiskLevel = "NONE" | "LOW" | "MODERATE" | "HIGH";

export interface WeatherRiskAssessment {
  available: boolean;
  provider: string;
  region: string;
  alertSeverity: WeatherAlertSeverity;
  alertTitle?: string;
  alertDescription?: string;
  potentialSupplyRisk: SupplyRiskLevel;
  affectedCrops: string[];
  disclaimer: string;
}

export interface SeasonalFactor {
  event: string;
  seasonType: "FESTIVAL" | "HARVEST" | "SOWING" | "MONSOON" | "LEAN";
  signal: "POTENTIAL_DEMAND_INCREASE" | "POTENTIAL_SUPPLY_SURGE" | "POTENTIAL_SUPPLY_CRUNCH" | "NEUTRAL";
  description: string;
  cropsInvolved: string[];
}

export interface MarketPriceHistoryPoint {
  date: string;
  price: number;
  min?: number;
  max?: number;
}

export interface MarketPriceSummary {
  // Existing backward-compatible fields
  id: string;
  crop: string;
  unit: string; // "kg"
  currency: string; // "INR"
  current: number; // modal price per kg
  avg30d?: number | null;
  min30d?: number | null;
  max30d?: number | null;
  source: string;
  history: MarketPriceHistoryPoint[];
  updatedAt: string | Date;

  // Enriched multi-source intelligence fields
  commodity: string;
  variety?: string;
  market?: string;
  state?: string;
  arrivalDate?: string;
  minPrice?: number;
  maxPrice?: number;
  modalPrice?: number;
  provenance?: SourceProvenance;
  comparison?: CrossSourceComparison;
  analytics?: HistoricalAnalytics;
  anomaly?: AnomalyResult;
  weatherRisk?: WeatherRiskAssessment;
  seasonalContext?: SeasonalFactor[];
  isDemo?: boolean;
  stale?: boolean;
  sourcesAvailable?: string[];
}
