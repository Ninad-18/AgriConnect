import i18n from "@/i18n";

function getLocaleTag(lang?: string): string {
  const current = lang || i18n.language || "en";
  if (current === "hi") return "hi-IN";
  if (current === "mr") return "mr-IN";
  return "en-IN";
}

export function fmtDate(iso?: string, lang?: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString(getLocaleTag(lang), {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
}

export function fmtDateTime(iso?: string, lang?: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(getLocaleTag(lang), {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

export function fmtINR(n: number, lang?: string): string {
  try {
    return new Intl.NumberFormat(getLocaleTag(lang), {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n ?? 0);
  } catch {
    return `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
  }
}

export function fmtKg(n: number, lang?: string): string {
  const tag = getLocaleTag(lang);
  const formatted = new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(n ?? 0);
  const unit = i18n.t("common:units.kg", { defaultValue: "kg" });
  return `${formatted} ${unit}`;
}

export function timeAgo(iso?: string): string {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return i18n.t("common:time.justNow", { defaultValue: "just now" });
  if (mins < 60) return i18n.t("common:time.minsAgo", { count: mins, defaultValue: `${mins}m ago` });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return i18n.t("common:time.hrsAgo", { count: hrs, defaultValue: `${hrs}h ago` });
  const days = Math.floor(hrs / 24);
  return i18n.t("common:time.daysAgo", { count: days, defaultValue: `${days}d ago` });
}

export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export function classNames(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
