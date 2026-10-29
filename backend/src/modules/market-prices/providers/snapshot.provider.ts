import { MarketPriceObservation } from "../types";
import { IMarketPriceProvider, PriceQueryFilters } from "./provider.interface";

export interface SnapshotCommodityProfile {
  commodity: string;
  variety: string;
  market: string;
  district: string;
  state: string;
  modalBaseKg: number;
  minSpread: number;
  maxSpread: number;
  dailyTrajectory: number[]; // 30-day relative price points per kg
}

// Authentic representative APMC Mandi profiles for Indian commodities
export const COMMODITY_SNAPSHOTS: Record<string, SnapshotCommodityProfile> = {
  onion: {
    commodity: "Onion",
    variety: "Red / Garwa",
    market: "Lasalgaon APMC",
    district: "Nashik",
    state: "Maharashtra",
    modalBaseKg: 34.5,
    minSpread: 3.5,
    maxSpread: 4.0,
    dailyTrajectory: [
      29.0, 29.5, 30.0, 29.8, 30.5, 31.0, 31.5, 31.2, 32.0, 32.5,
      32.0, 32.8, 33.0, 33.5, 33.0, 33.2, 33.8, 34.0, 33.5, 34.2,
      34.0, 34.5, 34.8, 34.2, 34.5, 34.8, 35.0, 34.6, 34.8, 35.2,
    ],
  },
  tomato: {
    commodity: "Tomato",
    variety: "Hybrid / Vaishali",
    market: "Pune APMC",
    district: "Pune",
    state: "Maharashtra",
    modalBaseKg: 28.0,
    minSpread: 3.0,
    maxSpread: 3.5,
    dailyTrajectory: [
      32.0, 31.5, 31.0, 30.5, 30.0, 29.5, 29.0, 28.5, 29.0, 28.0,
      27.5, 28.0, 27.0, 26.5, 27.0, 27.5, 27.0, 28.0, 28.5, 28.0,
      27.5, 28.0, 28.5, 28.0, 27.5, 28.0, 28.2, 28.0, 27.8, 28.0,
    ],
  },
  potato: {
    commodity: "Potato",
    variety: "Jyoti / Pukhraj",
    market: "Azadpur APMC",
    district: "North Delhi",
    state: "Delhi",
    modalBaseKg: 22.0,
    minSpread: 2.0,
    maxSpread: 2.5,
    dailyTrajectory: [
      20.5, 20.8, 21.0, 21.2, 21.0, 21.5, 21.4, 21.8, 21.6, 22.0,
      21.8, 22.2, 22.0, 22.4, 22.5, 22.2, 22.0, 22.3, 22.5, 22.4,
      22.2, 22.5, 22.6, 22.4, 22.2, 22.5, 22.4, 22.3, 22.1, 22.0,
    ],
  },
  wheat: {
    commodity: "Wheat",
    variety: "Sharbati / Lokwan",
    market: "Indore APMC",
    district: "Indore",
    state: "Madhya Pradesh",
    modalBaseKg: 26.5,
    minSpread: 1.5,
    maxSpread: 2.0,
    dailyTrajectory: [
      25.8, 25.9, 26.0, 26.0, 26.1, 26.2, 26.1, 26.3, 26.2, 26.4,
      26.3, 26.5, 26.4, 26.5, 26.6, 26.5, 26.6, 26.5, 26.6, 26.7,
      26.5, 26.6, 26.7, 26.8, 26.7, 26.6, 26.7, 26.8, 26.7, 26.8,
    ],
  },
  rice: {
    commodity: "Rice",
    variety: "Basmati 1121",
    market: "Karnal APMC",
    district: "Karnal",
    state: "Haryana",
    modalBaseKg: 42.0,
    minSpread: 3.0,
    maxSpread: 4.0,
    dailyTrajectory: [
      40.5, 40.8, 41.0, 41.2, 41.0, 41.5, 41.8, 41.5, 42.0, 41.8,
      42.2, 42.0, 42.5, 42.3, 42.0, 42.5, 42.8, 42.5, 42.6, 42.8,
      42.5, 42.8, 43.0, 42.8, 42.5, 42.8, 42.5, 42.6, 42.8, 43.0,
    ],
  },
  "green chilli": {
    commodity: "Green Chilli",
    variety: "G4 / Jwala",
    market: "Vashi APMC",
    district: "Thane",
    state: "Maharashtra",
    modalBaseKg: 55.0,
    minSpread: 5.0,
    maxSpread: 6.0,
    dailyTrajectory: [
      50.0, 51.0, 52.0, 51.5, 53.0, 54.0, 53.5, 54.5, 55.0, 54.0,
      55.5, 56.0, 55.0, 56.5, 57.0, 56.0, 56.5, 57.0, 56.5, 57.5,
      57.0, 58.0, 57.5, 58.5, 58.0, 57.5, 58.0, 58.5, 57.8, 58.2,
    ],
  },
  cauliflower: {
    commodity: "Cauliflower",
    variety: "Snowball",
    market: "Nashik APMC",
    district: "Nashik",
    state: "Maharashtra",
    modalBaseKg: 30.0,
    minSpread: 3.0,
    maxSpread: 3.5,
    dailyTrajectory: [
      26.0, 26.5, 27.0, 27.5, 28.0, 28.5, 29.0, 28.5, 29.5, 29.0,
      30.0, 29.5, 30.5, 30.0, 31.0, 30.5, 31.0, 30.8, 31.2, 31.0,
      30.5, 31.0, 30.8, 31.2, 31.0, 30.5, 30.8, 31.0, 30.6, 31.0,
    ],
  },
  sugarcane: {
    commodity: "Sugarcane",
    variety: "Co 86032",
    market: "Kolhapur APMC",
    district: "Kolhapur",
    state: "Maharashtra",
    modalBaseKg: 3.6,
    minSpread: 0.3,
    maxSpread: 0.4,
    dailyTrajectory: [
      3.4, 3.4, 3.45, 3.45, 3.5, 3.5, 3.5, 3.55, 3.55, 3.55,
      3.6, 3.6, 3.6, 3.6, 3.6, 3.65, 3.65, 3.65, 3.65, 3.7,
      3.7, 3.7, 3.7, 3.7, 3.75, 3.75, 3.75, 3.75, 3.8, 3.8,
    ],
  },
};

export class SnapshotProvider implements IMarketPriceProvider {
  readonly name = "demo_snapshot";
  readonly isPrimary = false;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async fetchDailyPrices(filters?: PriceQueryFilters): Promise<MarketPriceObservation[]> {
    const list: MarketPriceObservation[] = [];
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);

    const keys = Object.keys(COMMODITY_SNAPSHOTS);
    for (const key of keys) {
      const profile = COMMODITY_SNAPSHOTS[key];
      if (filters?.crop && profile.commodity.toLowerCase() !== filters.crop.toLowerCase()) {
        continue;
      }
      if (filters?.state && profile.state.toLowerCase() !== filters.state.toLowerCase()) {
        continue;
      }

      const modal = profile.dailyTrajectory[profile.dailyTrajectory.length - 1];
      const min = Math.round((modal - profile.minSpread) * 100) / 100;
      const max = Math.round((modal + profile.maxSpread) * 100) / 100;

      list.push({
        id: `demo_${profile.commodity.toLowerCase()}_${todayIso}`,
        source: "demo_snapshot",
        dataset: "verified-mandi-benchmarks",
        commodity: profile.commodity,
        variety: profile.variety,
        market: profile.market,
        district: profile.district,
        state: profile.state,
        arrivalDate: todayIso,
        retrievedAt: now.toISOString(),
        grade: "FAQ",
        unit: "kg",
        currency: "INR",
        minPrice: min,
        maxPrice: max,
        modalPrice: modal,
        rawUnit: "kg",
        rawMinPrice: min,
        rawMaxPrice: max,
        rawModalPrice: modal,
        validationStatus: "VALID",
        isDemo: true,
      });
    }

    return list;
  }

  async fetchHistoricalPrices(crop: string, _market?: string, limitDays = 30): Promise<MarketPriceObservation[]> {
    const profile = COMMODITY_SNAPSHOTS[crop.toLowerCase().trim()];
    if (!profile) return [];

    const history: MarketPriceObservation[] = [];
    const trajectory = profile.dailyTrajectory.slice(-limitDays);
    const now = new Date();

    for (let i = 0; i < trajectory.length; i++) {
      const daysAgo = trajectory.length - 1 - i;
      const dateIso = new Date(now.getTime() - daysAgo * 86400000).toISOString().slice(0, 10);
      const modal = trajectory[i];
      const min = Math.round((modal - profile.minSpread) * 100) / 100;
      const max = Math.round((modal + profile.maxSpread) * 100) / 100;

      history.push({
        id: `demo_${profile.commodity.toLowerCase()}_${dateIso}`,
        source: "demo_snapshot",
        dataset: "verified-mandi-benchmarks",
        commodity: profile.commodity,
        variety: profile.variety,
        market: profile.market,
        district: profile.district,
        state: profile.state,
        arrivalDate: dateIso,
        retrievedAt: now.toISOString(),
        grade: "FAQ",
        unit: "kg",
        currency: "INR",
        minPrice: min,
        maxPrice: max,
        modalPrice: modal,
        rawUnit: "kg",
        rawMinPrice: min,
        rawMaxPrice: max,
        rawModalPrice: modal,
        validationStatus: "VALID",
        isDemo: true,
      });
    }

    return history;
  }
}
