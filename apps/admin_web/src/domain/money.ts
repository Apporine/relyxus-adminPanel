import type { CurrencyCode, Money } from "./types";

/**
 * Totals per currency. Values in different currencies are never converted without an
 * approved FX source (spec §22, §43: no invented finance precision).
 */
export function sumByCurrency(values: Array<Money | undefined>): Money[] {
  const totals = new Map<CurrencyCode, number>();
  for (const value of values) {
    if (!value) continue;
    totals.set(value.currency, (totals.get(value.currency) ?? 0) + value.amountMinor);
  }
  return [...totals.entries()]
    .map(([currency, amountMinor]) => ({ currency, amountMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor);
}
