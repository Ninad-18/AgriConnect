import { api } from "@/services/api";
import type { Bid } from "@/types";

export interface CreateBidInput {
  procurementId: string;
  quantityKg: number;
  pricePerKg: number;
  grade: "A" | "B" | "C";
  deliveryDate: string;
  note?: string;
  images?: File[];
}

export async function createBid(input: CreateBidInput): Promise<Bid> {
  const fd = new FormData();
  fd.append("procurementId", input.procurementId);
  fd.append("quantityKg", String(input.quantityKg));
  fd.append("pricePerKg", String(input.pricePerKg));
  fd.append("grade", input.grade);
  fd.append("deliveryDate", input.deliveryDate);
  if (input.note) fd.append("note", input.note);
  for (const img of input.images ?? []) fd.append("images", img);

  const { data } = await api.post("/bids", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data as Bid;
}

export async function fetchMyBids(): Promise<Bid[]> {
  const { data } = await api.get("/bids/mine");
  return data.data ?? [];
}

export async function fetchBid(id: string): Promise<Bid> {
  const { data } = await api.get(`/bids/${id}`);
  return data.data as Bid;
}

export async function updateBid(id: string, patch: Partial<CreateBidInput>): Promise<Bid> {
  const { data } = await api.put(`/bids/${id}`, patch);
  return data.data as Bid;
}

export async function withdrawBid(id: string): Promise<Bid> {
  const { data } = await api.patch(`/bids/${id}/withdraw`);
  return data.data as Bid;
}

export async function fetchBidsForProcurement(procurementId: string): Promise<Bid[]> {
  const { data } = await api.get(`/procurements/${procurementId}`);
  const proc = data.data as { bids?: Bid[] };
  return proc.bids ?? [];
}