import { api } from "@/services/api";
import type { ProcurementRequest, AllocationResult } from "@/types";

export interface CreateProcurementInput {
  productName: string;
  productId?: string;
  quantityKg: number;
  minGrade: "A" | "B" | "C";
  deliveryDate: string;
  bidDeadline: string;
  transport: "SUPPLIER" | "FARMER";
  allowPartial?: boolean;
  allocationMode?: "MANUAL" | "SMART";
  targetPrice?: number;
  notes?: string;
}

export async function createProcurement(payload: CreateProcurementInput): Promise<ProcurementRequest> {
  const { data } = await api.post("/procurements", payload);
  return data.data as ProcurementRequest;
}

export async function fetchProcurements(params?: {
  mine?: boolean;
  status?: string;
  role?: string;
}): Promise<ProcurementRequest[]> {
  const { data } = await api.get("/procurements", { params });
  return data.data ?? [];
}

export async function fetchProcurement(id: string): Promise<ProcurementRequest> {
  const { data } = await api.get(`/procurements/${id}`);
  return data.data as ProcurementRequest;
}

export async function fetchRecommendations(id: string): Promise<AllocationResult> {
  const { data } = await api.get(`/procurements/${id}/recommendations`);
  return data.data as AllocationResult;
}

export async function acceptBids(
  procurementId: string,
  payload: { bidIds: string[]; allocationMode?: string }
): Promise<{ contracts: unknown[]; awardedQuantityKg: number; status: string }> {
  const { data } = await api.post(`/procurements/${procurementId}/accept-bids`, payload);
  return data.data;
}

export async function updateProcurementStatus(
  id: string,
  status: "OPEN" | "BIDDING_CLOSED" | "CANCELLED"
): Promise<ProcurementRequest> {
  const { data } = await api.patch(`/procurements/${id}/status`, { status });
  return data.data as ProcurementRequest;
}