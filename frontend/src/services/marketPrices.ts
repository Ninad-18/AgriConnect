import { api } from "@/services/api";
import type { MarketPrice } from "@/types";

export async function fetchPrices(): Promise<MarketPrice[]> {
  const { data } = await api.get("/market-prices");
  return data.data ?? [];
}

export async function fetchPrice(crop: string): Promise<MarketPrice> {
  const { data } = await api.get(`/market-prices/${crop}`);
  return data.data as MarketPrice;
}

export async function fetchHistory(crop: string): Promise<{ date: string; price: number }[]> {
  const { data } = await api.get(`/market-prices/history/${crop}`);
  return data.data ?? [];
}

export async function refreshPrice(crop: string): Promise<void> {
  await api.post(`/market-prices/refresh/${crop}`);
}