import { api } from "@/services/api";
import type { ProductListing } from "@/types";

export async function fetchListings(params?: {
  search?: string;
  grade?: string;
  maxPrice?: number;
  supplierId?: string;
}): Promise<ProductListing[]> {
  const { data } = await api.get("/products", { params });
  return data.data ?? [];
}

export async function fetchListing(id: string): Promise<ProductListing> {
  const { data } = await api.get(`/products/${id}`);
  return data.data as ProductListing;
}

export async function createListing(form: {
  inventoryId: string;
  title: string;
  description?: string;
  pricePerKg: number;
  images: File[];
}): Promise<ProductListing> {
  const fd = new FormData();
  fd.append("inventoryId", form.inventoryId);
  fd.append("title", form.title);
  if (form.description) fd.append("description", form.description);
  fd.append("pricePerKg", String(form.pricePerKg));
  for (const f of form.images) fd.append("images", f);
  const { data } = await api.post("/products", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data as ProductListing;
}

export async function updateListing(
  id: string,
  patch: { title?: string; description?: string; pricePerKg?: number; isActive?: boolean }
): Promise<ProductListing> {
  const { data } = await api.put(`/products/${id}`, patch);
  return data.data as ProductListing;
}

export async function deactivateListing(id: string): Promise<void> {
  const { data } = await api.delete(`/products/${id}`);
  return data.data;
}