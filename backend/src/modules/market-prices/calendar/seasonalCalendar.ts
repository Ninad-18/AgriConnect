import { SeasonalFactor } from "../types";

export interface FestivalCalendarEntry {
  name: string;
  month: number; // 1-12
  seasonType: "FESTIVAL" | "HARVEST" | "SOWING" | "MONSOON" | "LEAN";
  associatedCrops: Record<
    string,
    {
      signal: SeasonalFactor["signal"];
      description: string;
    }
  >;
}

export const CROP_SEASONAL_CALENDAR: FestivalCalendarEntry[] = [
  {
    name: "Diwali & Festive Season",
    month: 10, // October/November
    seasonType: "FESTIVAL",
    associatedCrops: {
      sugarcane: {
        signal: "POTENTIAL_DEMAND_INCREASE",
        description: "Seasonal spike in sweet and jaggery demand during national festive peak.",
      },
      potato: {
        signal: "POTENTIAL_DEMAND_INCREASE",
        description: "Elevated household consumption during celebration weeks.",
      },
      onion: {
        signal: "POTENTIAL_SUPPLY_CRUNCH",
        description: "Transit gap between stored rabi onion exhaustion and fresh kharif arrivals.",
      },
    },
  },
  {
    name: "Kharif Arrival & Post-Monsoon Window",
    month: 11, // November
    seasonType: "HARVEST",
    associatedCrops: {
      rice: {
        signal: "POTENTIAL_SUPPLY_SURGE",
        description: "New season paddy arrivals commencing across northern and southern mandis.",
      },
      tomato: {
        signal: "POTENTIAL_SUPPLY_SURGE",
        description: "Peak harvest flush in peninsular growing belts typically expands market arrivals.",
      },
    },
  },
  {
    name: "Rabi Sowing & Makar Sankranti",
    month: 1, // January
    seasonType: "FESTIVAL",
    associatedCrops: {
      sugarcane: {
        signal: "POTENTIAL_DEMAND_INCREASE",
        description: "Makar Sankranti and Pongal harvest celebrations drive fresh cane and jaggery demand.",
      },
      wheat: {
        signal: "NEUTRAL",
        description: "Active vegetative growth phase across Punjab, Haryana, and MP.",
      },
    },
  },
  {
    name: "Rabi Harvest Window",
    month: 4, // April
    seasonType: "HARVEST",
    associatedCrops: {
      wheat: {
        signal: "POTENTIAL_SUPPLY_SURGE",
        description: "National rabi wheat harvest peak with high government procurement mandi arrivals.",
      },
      onion: {
        signal: "POTENTIAL_SUPPLY_SURGE",
        description: "Fresh rabi onion harvest (best quality for cold storage) floods Maharashtra mandis.",
      },
    },
  },
  {
    name: "Summer Lean Season",
    month: 6, // June
    seasonType: "LEAN",
    associatedCrops: {
      tomato: {
        signal: "POTENTIAL_SUPPLY_CRUNCH",
        description: "High ambient summer temperatures reduce shelf life and limit inter-state transport.",
      },
      "green chilli": {
        signal: "POTENTIAL_SUPPLY_CRUNCH",
        description: "Heatwave-induced flower drop temporarily constrains open-field harvest.",
      },
    },
  },
];

/**
 * Returns active seasonal factors for a crop in the current or specified month.
 * Does NOT declare confirmed price predictions; outputs are tagged as "potential demand/supply signals".
 */
export function getSeasonalFactors(crop: string, targetMonth?: number): SeasonalFactor[] {
  const normCrop = crop.toLowerCase().trim();
  const month = targetMonth ?? new Date().getMonth() + 1; // 1-12

  const factors: SeasonalFactor[] = [];

  for (const entry of CROP_SEASONAL_CALENDAR) {
    // Match events occurring in target month or adjacent month (+-1)
    const monthDiff = Math.abs(entry.month - month);
    if (monthDiff === 0 || monthDiff === 1 || monthDiff === 11) {
      const cropImpact = entry.associatedCrops[normCrop];
      if (cropImpact) {
        factors.push({
          event: entry.name,
          seasonType: entry.seasonType,
          signal: cropImpact.signal,
          description: `${cropImpact.description} (Signal: ${cropImpact.signal.replace(/_/g, " ")})`,
          cropsInvolved: [crop],
        });
      }
    }
  }

  return factors;
}
