import { api } from "@/services/api";
import type { Address } from "@/types";

export async function fetchAddresses(): Promise<Address[]> {
  const { data } = await api.get("/customers/addresses");
  return data.data ?? [];
}

export async function createAddress(
  input: Omit<Address, "id" | "isDefault">
): Promise<Address> {
  const { data } = await api.post("/customers/addresses", input);
  return data.data as Address;
}

export async function fetchCustomerProfile(): Promise<{
  id: string;
  userId: string;
  name?: string;
  phone?: string;
}> {
  const { data } = await api.get("/customers/profile");
  return data.data;
}

export async function updateCustomerProfile(
  patch: { name?: string; phone?: string }
): Promise<unknown> {
  const { data } = await api.put("/customers/profile", patch);
  return data.data;
}