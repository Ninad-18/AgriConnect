import { classNames } from "@/lib/format";
import type { ReactNode } from "react";

type Tone = "green" | "orange" | "red" | "blue" | "gray" | "amber";

const tones: Record<Tone, string> = {
  green: "bg-green-100 text-green-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  gray: "bg-stone-100 text-stone-600",
  amber: "bg-amber-100 text-amber-700",
};

export function toneFor(status?: string): Tone {
  const s = (status ?? "").toUpperCase();
  if (["OPEN", "BIDDING_CLOSED", "ACCEPTED", "ACTIVE", "AVAILABLE", "CONFIRMED", "COMPLETED", "DELIVERED", "PAID", "CAPTURED"].includes(s)) return "green";
  if (["PENDING", "IN_DELIVERY", "RECEIVED", "AWAITING_PAYMENT", "RESERVED"].includes(s)) return "blue";
  if (["LATE", "DISPUTED", "PARTIALLY_FILLED", "ATTEMPTED"].includes(s)) return "amber";
  if (["FAILED", "REJECTED", "CANCELLED", "SOLD_OUT", "EXPIRED"].includes(s)) return "red";
  if (["DRAFT", "QUALITY_VERIFIED"].includes(s)) return "gray";
  return "gray";
}

export function toneText(status?: string): string {
  return (status ?? "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function Badge({ status, children }: { status?: string; children?: ReactNode }) {
  return (
    <span className={classNames("badge", tones[toneFor(status)])}>
      {children ?? toneText(status)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "green",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "green" | "orange" | "blue";
}) {
  const icon = {
    green: "bg-green-100 text-green-700",
    orange: "bg-orange-100 text-orange-700",
    blue: "bg-blue-100 text-blue-700",
  }[tone];
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</p>
        <span className={classNames("h-2.5 w-2.5 rounded-full", icon.split(" ")[0])} />
      </div>
      <p className="mt-2 text-2xl font-bold text-forest">{value}</p>
      {sub && <p className="mt-1 text-xs text-stone-500">{sub}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card border-dashed text-center">
      <p className="text-sm font-semibold text-stone-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}