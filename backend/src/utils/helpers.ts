import { randomBytes } from "crypto";
import { Grade } from "./constants";

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
