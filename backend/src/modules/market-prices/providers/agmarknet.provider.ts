import { MarketPriceObservation, RawObservationInput } from "../types";
import { normalizeObservation, deduplicateObservations } from "../normalization/normalizer";
import { IMarketPriceProvider, PriceQueryFilters } from "./provider.interface";

export interface AgmarknetProviderOptions {
  apiKey?: string;
  resourceId?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class AgmarknetProvider implements IMarketPriceProvider {
  readonly name = "agmarknet";
  readonly isPrimary = true;

  private apiKey: string;
  private resourceId: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options?: AgmarknetProviderOptions) {
    this.apiKey = options?.apiKey || process.env.DATA_GOV_IN_API_KEY || "";
    this.resourceId =
      options?.resourceId ||
      process.env.AGMARKNET_RESOURCE_ID ||
      "9ef84268-d588-465a-a308-a864a43d0070";
    this.baseUrl = options?.baseUrl || "https://api.data.gov.in/resource";
    this.timeoutMs = options?.timeoutMs || 8000;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async fetchDailyPrices(filters?: PriceQueryFilters): Promise<MarketPriceObservation[]> {
    if (!(await this.isAvailable())) {
      return [];
    }

    const url = new URL(`${this.baseUrl}/${this.resourceId}`);
    url.searchParams.set("api-key", this.apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(filters?.limit || 100));

    if (filters?.crop) {
      url.searchParams.set("filters[commodity.keyword]", filters.crop);
    }
    if (filters?.state) {
      url.searchParams.set("filters[state.keyword]", filters.state);
    }
    if (filters?.market) {
      url.searchParams.set("filters[market.keyword]", filters.market);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const resp = await fetch(url.toString(), {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (!resp.ok) {
        console.warn(`[agmarknet] Upstream responded with status ${resp.status}`);
        return [];
      }

      const json = await resp.json() as {
        records?: Array<{
          state?: string;
          district?: string;
          market?: string;
          commodity?: string;
          variety?: string;
          arrival_date?: string;
          min_price?: string | number;
          max_price?: string | number;
          modal_price?: string | number;
        }>;
      };

      const records = json.records || [];
      const normalizedObs: MarketPriceObservation[] = [];

      for (const rec of records) {
        const rawInput: RawObservationInput = {
          source: "agmarknet",
          dataset: this.resourceId,
          commodity: rec.commodity || filters?.crop || "",
          variety: rec.variety || "Common",
          market: rec.market || "",
          district: rec.district || "",
          state: rec.state || "",
          arrivalDate: rec.arrival_date || new Date().toISOString().slice(0, 10),
          unit: "Quintal", // Standard data.gov.in Agmarknet reporting unit
          minPrice: rec.min_price ?? 0,
          maxPrice: rec.max_price ?? 0,
          modalPrice: rec.modal_price ?? 0,
          isDemo: false,
        };

        const result = normalizeObservation(rawInput);
        if (result.observation.validationStatus === "VALID") {
          normalizedObs.push(result.observation);
        }
      }

      return deduplicateObservations(normalizedObs);
    } catch (err) {
      console.warn(`[agmarknet] Fetch failed: ${(err as Error).message}`);
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  async fetchHistoricalPrices(crop: string, market?: string, limitDays = 30): Promise<MarketPriceObservation[]> {
    return this.fetchDailyPrices({ crop, market, limit: limitDays });
  }
}
