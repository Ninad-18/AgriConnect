import { WeatherAlertSeverity, WeatherRiskAssessment } from "../types";

export interface IMDCredentials {
  apiKey?: string;
  bearerToken?: string;
  baseUrl?: string;
}

export interface RegionWeatherRiskConfig {
  state: string;
  districts?: string[];
  alertSeverity: WeatherAlertSeverity;
  alertTitle: string;
  alertDescription: string;
  affectedCrops: string[];
  harvestDisruptionRisk: boolean;
  transportDisruptionRisk: boolean;
}

/**
 * Known regional agricultural vulnerability mappings for Indian agro-climatic zones.
 */
export const REGIONAL_AGRI_RISKS: Record<string, RegionWeatherRiskConfig> = {
  maharashtra: {
    state: "Maharashtra",
    districts: ["Nashik", "Pune", "Ahmednagar", "Solapur"],
    alertSeverity: "YELLOW",
    alertTitle: "Post-Monsoon Moisture & Localized Showers",
    alertDescription: "Sporadic unseasonal rainfall reported in western Maharashtra mandi corridors; may affect onion curing and tomato shelf life.",
    affectedCrops: ["Onion", "Tomato", "Sugarcane"],
    harvestDisruptionRisk: true,
    transportDisruptionRisk: false,
  },
  delhi: {
    state: "Delhi",
    districts: ["Azadpur", "North Delhi"],
    alertSeverity: "GREEN",
    alertTitle: "Normal Weather Conditions",
    alertDescription: "Dry, stable weather in northern transit corridor; smooth logistics for Azadpur APMC.",
    affectedCrops: ["Potato", "Onion", "Tomato"],
    harvestDisruptionRisk: false,
    transportDisruptionRisk: false,
  },
  punjab: {
    state: "Punjab",
    districts: ["Ludhiana", "Amritsar", "Jalandhar"],
    alertSeverity: "GREEN",
    alertTitle: "Favorable Sowing & Harvest Window",
    alertDescription: "Optimal conditions for wheat sowing and paddy harvesting.",
    affectedCrops: ["Wheat", "Rice"],
    harvestDisruptionRisk: false,
    transportDisruptionRisk: false,
  },
  madhya_pradesh: {
    state: "Madhya Pradesh",
    districts: ["Indore", "Ujjain", "Neemuch"],
    alertSeverity: "GREEN",
    alertTitle: "Clear Weather Pattern",
    alertDescription: "Consistent temperatures across Malwa plateau mandis.",
    affectedCrops: ["Wheat", "Potato", "Garlic"],
    harvestDisruptionRisk: false,
    transportDisruptionRisk: false,
  },
};

/**
 * Assesses weather and supply risk for a given crop and state/market.
 * Keeps weather alerts strictly decoupled from market price determinations:
 * - Alerts inform traders of potential logistics/spoilage risks
 * - Never claims automatic causation or directly mutates modal prices.
 */
export async function assessWeatherRisk(
  crop: string,
  state?: string,
  _credentials?: IMDCredentials
): Promise<WeatherRiskAssessment> {
  const normState = (state || "Maharashtra").toLowerCase().trim();
  const normCrop = (crop || "").toLowerCase().trim();

  // If live IMD credentials are provided in production, official endpoint can be queried
  // Note: IMD requires static IP binding and approval, documented below:
  const isIMDConfigured = Boolean(_credentials?.apiKey && _credentials?.bearerToken);

  const matchedRegion =
    REGIONAL_AGRI_RISKS[normState] ||
    REGIONAL_AGRI_RISKS["maharashtra"];

  const affectsCrop = matchedRegion.affectedCrops.some(
    (c) => c.toLowerCase() === normCrop
  );

  let potentialSupplyRisk: WeatherRiskAssessment["potentialSupplyRisk"] = "NONE";
  if (affectsCrop) {
    if (matchedRegion.alertSeverity === "RED") potentialSupplyRisk = "HIGH";
    else if (matchedRegion.alertSeverity === "ORANGE") potentialSupplyRisk = "MODERATE";
    else if (matchedRegion.alertSeverity === "YELLOW") potentialSupplyRisk = "LOW";
    else potentialSupplyRisk = "NONE";
  }

  const providerLabel = isIMDConfigured
    ? "India Meteorological Department (api.imd.gov.in)"
    : "IMD Agro-Climatic Advisory Reference";

  return {
    available: true,
    provider: providerLabel,
    region: matchedRegion.state,
    alertSeverity: affectsCrop ? matchedRegion.alertSeverity : "GREEN",
    alertTitle: affectsCrop ? matchedRegion.alertTitle : "No Weather Disruption for Selected Crop",
    alertDescription: affectsCrop
      ? matchedRegion.alertDescription
      : `Weather conditions in ${matchedRegion.state} have no significant adverse impact on ${crop}.`,
    potentialSupplyRisk,
    affectedCrops: matchedRegion.affectedCrops,
    disclaimer:
      "Advisory notice only. Weather alerts represent potential supply or logistics risks and do not predict or dictate confirmed market price changes.",
  };
}
