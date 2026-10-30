import { MarketPriceObservation } from "../types";

export interface PriceQueryFilters {
  crop?: string;
  state?: string;
  market?: string;
  variety?: string;
  date?: string;
  limit?: number;
}

export interface IMarketPriceProvider {
  readonly name: string;
  readonly isPrimary: boolean;
  isAvailable(): Promise<boolean>;
  fetchDailyPrices(filters?: PriceQueryFilters): Promise<MarketPriceObservation[]>;
  fetchHistoricalPrices(crop: string, market?: string, days?: number): Promise<MarketPriceObservation[]>;
}
