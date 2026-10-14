import { api } from "@/services/api";
import type { AuthResponse, FarmerProfile, SupplierProfile, User } from "@/types";

export type RegisterRole = "FARMER" | "SUPPLIER" | "CUSTOMER";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
  role: RegisterRole;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post("/auth/login", { email, password });
  return data.data as AuthResponse;
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const { data } = await api.post("/auth/register", input);
  return data.data as AuthResponse;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get("/auth/me");
  return (data.data as { user: User }).user;
}

export async function fetchFarmerProfile(): Promise<FarmerProfile> {
  const { data } = await api.get("/farmers/me");
  return data.data as FarmerProfile;
}

export async function fetchSupplierProfile(): Promise<SupplierProfile> {
  const { data } = await api.get("/suppliers/me");
  return data.data as SupplierProfile;
}

export async function updateFarmerProfile(
  payload: Partial<FarmerProfile>
): Promise<FarmerProfile> {
  const { data } = await api.put("/farmers/me", payload);
  return data.data as FarmerProfile;
}

export async function updateSupplierProfile(
  payload: Partial<SupplierProfile>
): Promise<SupplierProfile> {
  const { data } = await api.put("/suppliers/me", payload);
  return data.data as SupplierProfile;
}