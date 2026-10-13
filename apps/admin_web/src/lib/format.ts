import type { Iso, Money } from "@/domain/types";

const DAY_MS = 86_400_000;

/** Compact currency for dashboards, such as £4.8M or £640K. */
export function formatMoneyCompact(money: Money): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: money.currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(money.amountMinor / 100);
}

/** Full currency without minor units, for tables and detail pages. */
export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: 0,
  }).format(money.amountMinor / 100);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

export function formatPercent(ratio: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    maximumFractionDigits: fractionDigits,
  }).format(ratio);
}

/** Calendar date, such as 13 Oct 2026. */
export function formatDate(iso: Iso): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/**
 * Absolute timestamp with its timezone. Audit-sensitive screens always show this;
 * relative time may accompany it but never replace it (spec §32).
 */
export function formatTimestamp(iso: Iso): string {
  return `${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(new Date(iso))} UTC`;
}

/** Whole days from `now` until `iso`; negative when `iso` is in the past. */
export function daysUntil(iso: Iso, now: Iso): number {
  return Math.ceil((Date.parse(iso) - Date.parse(now)) / DAY_MS);
}

/** Relative description such as "in 12 days", "today" or "3 days ago". */
export function formatRelativeDays(iso: Iso, now: Iso): string {
  const days = daysUntil(iso, now);
  if (days === 0) return "today";
  const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  return rtf.format(days, "day");
}

/** Relative time for recent activity, such as "2 hours ago". */
export function formatRelativeTime(iso: Iso, now: Iso): string {
  const diffMs = Date.parse(iso) - Date.parse(now);
  const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}
