import { MarketPriceObservation, RawObservationInput } from "../types";
import { normalizeObservation, deduplicateObservations } from "../normalization/normalizer";
import { IMarketPriceProvider, PriceQueryFilters } from "./provider.interface";

export interface EnamProviderOptions {
  apiUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

/**
 * Official e-NAM Market Price Provider.
 *
 * NOTE & LIMITATION:
 * The official e-NAM web portals (https://www.enam.gov.in/web/dashboard/agmarknet
 * and https://www.enam.gov.in/web/dashboard/Agm_Enam_ctrl) render aggregated dashboards
 * designed for interactive browser sessions. They do not currently offer a public, unauthenticated,
 * open REST API endpoint for third-party automated pipelines.
 *
 * When ENAM_API_URL and ENAM_API_KEY are configured, this provider communicates with the designated
 * endpoint. Otherwise, it gracefully reports unavailable without fabricating fictitious data.
 */
export class EnamProvider implements IMarketPriceProvider {
  readonly name = "enam";
  readonly isPrimary = false;

  private apiUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(options?: EnamProviderOptions) {
    this.apiUrl = options?.apiUrl || process.env.ENAM_API_URL || "";
    this.apiKey = options?.apiKey || process.env.ENAM_API_KEY || "";
    this.timeoutMs = options?.timeoutMs || 8000;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiUrl && this.apiUrl.trim().length > 0);
  }

  getUnavailableReason(): string {
    return "e-NAM public dashboard (enam.gov.in/web/dashboard/agmarknet) requires browser session cookies and does not provide an open developer API key service. Provider is isolated until verified enterprise API credentials are configured.";
  }

  async fetchDailyPrices(filters?: PriceQueryFilters): Promise<MarketPriceObservation[]> {
    if (!(await this.isAvailable())) {
      return [];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = new URL(this.apiUrl);
      if (filters?.crop) url.searchParams.set("commodity", filters.crop);
      if (filters?.state) url.searchParams.set("state", filters.state);
      if (filters?.market) url.searchParams.set("market", filters.market);

      const headers: Record<string, string> = { Accept: "application/json" };
      if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;

      const resp = await fetch(url.toString(), {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (!resp.ok) {
        console.warn(`[enam] Upstream returned status ${resp.status}`);
        return [];
      }

      const json = await resp.json() as {
        data?: Array<{
          state?: string;
          apmc?: string;
          commodity?: string;
          variety?: string;
          date?: string;
          minPrice?: number | string;
          maxPrice?: number | string;
          modalPrice?: number | string;
        }>;
      };

      const rows = json.data || [];
      const normalizedObs: MarketPriceObservation[] = [];

      for (const row of rows) {
        const rawInput: RawObservationInput = {
          source: "enam",
          dataset: "enam-dashboard",
          commodity: row.commodity || filters?.crop || "",
          variety: row.variety || "Common",
          market: row.apmc || "",
          state: row.state || "",
          arrivalDate: row.date || new Date().toISOString().slice(0, 10),
          unit: "Quintal",
          minPrice: row.minPrice ?? 0,
          maxPrice: row.maxPrice ?? 0,
          modalPrice: row.modalPrice ?? 0,
          isDemo: false,
        };

        const result = normalizeObservation(rawInput);
        if (result.observation.validationStatus === "VALID") {
          normalizedObs.push(result.observation);
        }
      }

      return deduplicateObservations(normalizedObs);
    } catch (err) {
      console.warn(`[enam] Fetch failed: ${(err as Error).message}`);
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  async fetchHistoricalPrices(crop: string, market?: string, days = 30): Promise<MarketPriceObservation[]> {
    return this.fetchDailyPrices({ crop, market, limit: days });
  }
}
