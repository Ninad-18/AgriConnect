import { api } from "@/services/api";
import type { InventoryItem } from "@/types";

export async function fetchInventory(): Promise<InventoryItem[]> {
  const { data } = await api.get("/inventory");
  return data.data ?? [];
}