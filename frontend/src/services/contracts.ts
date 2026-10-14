import { api } from "@/services/api";
import type { FarmerContract } from "@/types";

export interface ContractGroup {
  procurementId: string;
  productName: string;
  quantityKg: number;
  contracts: FarmerContract[];
}

export async function fetchSupplierContracts(): Promise<ContractGroup[]> {
  const { data } = await api.get("/suppliers/contracts");
  return data.data ?? [];
}

export async function fetchFarmerContracts(): Promise<FarmerContract[]> {
  const { data } = await api.get("/bids/mine");
  const bids = (data.data ?? []) as Array<{ contracts?: FarmerContract[] }>;
  return bids.map((b) => b.contracts ?? []).flat();
}