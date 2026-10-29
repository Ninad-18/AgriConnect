import { IMarketPriceProvider, PriceQueryFilters } from "./provider.interface";
import { AgmarknetProvider } from "./agmarknet.provider";
import { EnamProvider } from "./enam.provider";
import { SnapshotProvider } from "./snapshot.provider";
import { MarketPriceObservation } from "../types";

export class ProviderRegistry {
  private providers: Map<string, IMarketPriceProvider> = new Map();
  private primaryProviderName = "agmarknet";

  constructor() {
    this.register(new AgmarknetProvider());
    this.register(new EnamProvider());
    this.register(new SnapshotProvider());
  }

  register(provider: IMarketPriceProvider) {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  getProvider(name: string): IMarketPriceProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  async getPrimaryProvider(): Promise<IMarketPriceProvider> {
    const agmarknet = this.providers.get(this.primaryProviderName);
    if (agmarknet && (await agmarknet.isAvailable())) {
      return agmarknet;
    }
    // Fallback to verified benchmark snapshot provider when live government credentials are not configured
    return this.providers.get("demo_snapshot")!;
  }

  async getAvailableSecondaryProviders(excludeName?: string): Promise<IMarketPriceProvider[]> {
    const available: IMarketPriceProvider[] = [];
    for (const [name, provider] of this.providers.entries()) {
      if (excludeName && name === excludeName.toLowerCase()) continue;
      if (await provider.isAvailable()) {
        available.push(provider);
      }
    }
    return available;
  }

  /**
   * Queries primary and available secondary providers for cross-source comparison.
   */
  async queryAll(filters?: PriceQueryFilters): Promise<{
    primaryObservations: MarketPriceObservation[];
    secondaryObservations: MarketPriceObservation[];
    activeProviderNames: string[];
  }> {
    const primary = await this.getPrimaryProvider();
    const secondaries = await this.getAvailableSecondaryProviders(primary.name);

    const activeProviderNames = [primary.name, ...secondaries.map((s) => s.name)];

    const [primaryObs, ...secondaryResults] = await Promise.all([
      primary.fetchDailyPrices(filters).catch(() => []),
      ...secondaries.map((s) => s.fetchDailyPrices(filters).catch(() => [])),
    ]);

    const secondaryObs = secondaryResults.flat();

    return {
      primaryObservations: primaryObs,
      secondaryObservations: secondaryObs,
      activeProviderNames,
    };
  }
}

export const defaultRegistry = new ProviderRegistry();
