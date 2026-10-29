import { api } from "@/services/api";
import type { Grade, ProductListing } from "@/types";

export interface ListingFilters {
  search?: string;
  crop?: string;
  grade?: string;
  sellerId?: string;
  sellerRole?: "FARMER" | "SUPPLIER";
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc";
}

export async function fetchListings(params?: ListingFilters): Promise<ProductListing[]> {
  const { data } = await api.get("/products", { params });
  return data.data ?? [];
}

export async function fetchMyListings(): Promise<ProductListing[]> {
  const { data } = await api.get("/products/mine");
  return data.data ?? [];
}

export async function fetchListing(id: string): Promise<ProductListing> {
  const { data } = await api.get(`/products/${id}`);
  return data.data as ProductListing;
}

export type CreateListingInput = {
  title: string;
  description?: string;
  pricePerKg: number;
  images: File[];
} & (
  | { inventoryId: string; cropName?: never; grade?: never; quantityKg?: never }
  | {
      inventoryId?: never;
      cropName: string;
      grade: Grade;
      quantityKg: number;
    }
);

export async function createListing(form: CreateListingInput): Promise<ProductListing> {
  const fd = new FormData();
  if (form.inventoryId) fd.append("inventoryId", form.inventoryId);
  if (form.cropName) fd.append("cropName", form.cropName);
  if (form.grade) fd.append("grade", form.grade);
  if (form.quantityKg !== undefined) fd.append("quantityKg", String(form.quantityKg));
  fd.append("title", form.title);
  if (form.description) fd.append("description", form.description);
  fd.append("pricePerKg", String(form.pricePerKg));
  for (const f of form.images) fd.append("images", f);
  // Let the browser set multipart/form-data with its generated boundary.
  const { data } = await api.post("/products", fd);
  return data.data as ProductListing;
}

export async function updateListing(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    pricePerKg?: number;
    quantityKg?: number;
    isActive?: boolean;
  }
): Promise<ProductListing> {
  const { data } = await api.put(`/products/${id}`, patch);
  return data.data as ProductListing;
}

export async function deactivateListing(id: string): Promise<void> {
  const { data } = await api.delete(`/products/${id}`);
  return data.data;
}

export async function fetchCropSuggestions(): Promise<string[]> {
  const { data } = await api.get("/products/meta/crops");
  return data.data ?? [];
}
