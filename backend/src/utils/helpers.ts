import { randomBytes } from "crypto";
import type { GradeRank } from "@prisma/client";
import { Grade } from "./constants";

const GRADE_RANK_MAP: Record<Grade, GradeRank> = {
  A: "A_3",
  B: "B_2",
  C: "C_1",
};

// Map the domain grade to the persisted Prisma enum. Never construct these
// values with string interpolation: the enum is A_3/B_2/C_1, not A_1..A_3.
export function toGradeRank(grade: Grade): GradeRank {
  return GRADE_RANK_MAP[grade];
}

export function normalizeCropName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeCropList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const crop = normalizeCropName(value);
    if (!crop) continue;
    const key = crop.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(crop);
  }
  return result;
}

export function cropsMatch(a: string, b: string): boolean {
  return normalizeCropName(a).toLowerCase() === normalizeCropName(b).toLowerCase();
}

export function sellableStock(inventory: {
  quantityKg: number;
  reservedKg: number;
}): number {
  return Math.max(0, inventory.quantityKg - inventory.reservedKg);
}

export function hasSellableStock(inventory: {
  quantityKg: number;
  reservedKg: number;
}): boolean {
  return sellableStock(inventory) > 0;
}

// A listing is purchasable only while published and backed by sellable stock.
export function isListingVisible(listing: {
  isActive: boolean;
  inventory: { quantityKg: number; reservedKg: number };
}): boolean {
  return listing.isActive && hasSellableStock(listing.inventory);
}

// Ownership is always derived from the authenticated user, never a client id.
export function ownsResource(ownerId: string, userId: string): boolean {
  return Boolean(ownerId) && ownerId === userId;
}

export function generateOrderNumber(): string {
  const time = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `AC-${time}-${rand}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Normalize grade to rank comparator (A=3 > B=2 > C=1)
export function gradeRank(grade: Grade): number {
  return { A: 3, B: 2, C: 1 }[grade] ?? 0;
}

export function meetsMinGrade(grade: Grade, minGrade: Grade): boolean {
  return gradeRank(grade) >= gradeRank(minGrade);
}

export function toISODate(date: string | Date): Date {
  return date instanceof Date ? date : new Date(date);
}

export function kilometersBetween(origin?: { lat: number; lng: number }, dest?: { lat: number; lng: number }): number | null {
  if (!origin || !dest) return null;
  const R = 6371;
  const dLat = ((dest.lat - origin.lat) * Math.PI) / 180;
  const dLng = ((dest.lng - origin.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((origin.lat * Math.PI) / 180) *
      Math.cos((dest.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
