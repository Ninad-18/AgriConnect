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
  payload: { bidIds: string[] }
): Promise<{ contracts: unknown[]; awardedQuantityKg: number; status: string }> {
  if (!Array.isArray(payload.bidIds) || payload.bidIds.length === 0) {
    throw new Error("Select at least one active bid before accepting.");
  }
  // Keep this request body exactly aligned with acceptBidsSchema.
  const { data } = await api.post(
    `/procurements/${procurementId}/accept-bids`,
    JSON.stringify({ bidIds: payload.bidIds }),
    { headers: { "Content-Type": "application/json" } }
  );
  return data.data;
}

export async function updateProcurementStatus(
  id: string,
  status: "OPEN" | "BIDDING_CLOSED" | "CANCELLED"
): Promise<ProcurementRequest> {
  const { data } = await api.patch(`/procurements/${id}/status`, { status });
  return data.data as ProcurementRequest;
}
