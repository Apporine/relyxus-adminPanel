import type {
  CloudCostLine,
  Contract,
  Customer,
  FxRates,
  Iso,
  LaborRates,
  Money,
  ServiceTime,
} from "./types";

/**
 * Customer economics (spec §22). All results are GBP minor units. Contract values in
 * other currencies are converted only with a finance-approved rate, and every derived
 * figure is an estimate that the screens label as one.
 */

export function toGbp(money: Money, fx: FxRates): number {
  return money.amountMinor * fx.toGbp[money.currency];
}

/** Estimates are shown to the nearest £1,000; finer figures would be false precision. */
export function roundEstimate(minor: number): number {
  return Math.round(minor / 100_000) * 100_000;
}

// Allocation ------------------------------------------------------------------------------

export type AllocationView = "direct" | "by_value" | "even";

export const allocationViews: Record<AllocationView, { label: string; description: string }> = {
  by_value: {
    label: "Shared cost by contract value",
    description:
      "Customer-tagged cost goes to that customer; product-tagged cost is shared by annual contract value.",
  },
  even: {
    label: "Shared cost evenly",
    description:
      "Customer-tagged cost goes to that customer; product-tagged cost is shared evenly between the product's customers.",
  },
  direct: {
    label: "Direct cost only",
    description:
      "Only customer-tagged cost and customer time are allocated; shared product cost stays unallocated.",
  },
};

export interface EconomicsInput {
  customers: Customer[];
  lines: CloudCostLine[];
  time: ServiceTime[];
  labor: LaborRates;
  fx: FxRates;
}

export interface CustomerEconomics {
  customerId: string;
  acv?: Money;
  /** Annual contract value in GBP, converted when the contract is in another currency. */
  acvGbp?: number;
  converted: boolean;
  monthly: { cloud: number; support: number; operations: number; total: number };
  annualCost: number;
  supportHours: number;
  /** Annual contract value minus annualized direct service cost; absent without a value. */
  margin?: number;
  marginRatio?: number;
}

export function economics(input: EconomicsInput, view: AllocationView) {
  const { customers, lines, time, labor, fx } = input;
  const acvGbp = (c: Customer) => (c.annualContractValue ? toGbp(c.annualContractValue, fx) : 0);
  const cloud = new Map<string, number>(customers.map((c) => [c.id, 0]));
  let unallocated = 0;

  for (const line of lines) {
    const amount = toGbp(line.amount, fx);
    if (line.tag === "customer" && line.customerId && cloud.has(line.customerId)) {
      cloud.set(line.customerId, cloud.get(line.customerId)! + amount);
      continue;
    }
    if (line.tag !== "product" || view === "direct") {
      unallocated += amount;
      continue;
    }
    const sharers = customers.filter((c) => c.productIds.includes(line.productId!));
    const weights = sharers.map((c) => (view === "even" ? 1 : acvGbp(c)));
    const total = weights.reduce((a, b) => a + b, 0);
    if (!total) {
      unallocated += amount;
      continue;
    }
    sharers.forEach((c, i) => cloud.set(c.id, cloud.get(c.id)! + (amount * weights[i]!) / total));
  }

  const rows: CustomerEconomics[] = customers.map((c) => {
    const t = time.filter((s) => s.customerId === c.id);
    const supportHours = t.reduce((sum, s) => sum + s.supportHours, 0);
    const opsHours = t.reduce((sum, s) => sum + s.operationsHours, 0);
    const support = supportHours * labor.supportPerHour.amountMinor;
    const operations = opsHours * labor.operationsPerHour.amountMinor;
    const monthlyCloud = cloud.get(c.id) ?? 0;
    const total = monthlyCloud + support + operations;
    const annualCost = total * 12;
    const value = c.annualContractValue ? acvGbp(c) : undefined;
    return {
      customerId: c.id,
      acv: c.annualContractValue,
      acvGbp: value,
      converted: Boolean(c.annualContractValue && c.annualContractValue.currency !== "GBP"),
      monthly: { cloud: monthlyCloud, support, operations, total },
      annualCost,
      supportHours,
      margin: value === undefined ? undefined : value - annualCost,
      marginRatio: value ? (value - annualCost) / value : undefined,
    };
  });

  return { rows, unallocatedMonthly: unallocated };
}

/** Margin under every allocation view; the spread is the honest uncertainty. */
export function marginRanges(input: EconomicsInput) {
  const views = (Object.keys(allocationViews) as AllocationView[]).map(
    (v) => economics(input, v).rows,
  );
  return input.customers.map((c, i) => {
    const margins = views.map((rows) => rows[i]!.margin).filter((m) => m !== undefined);
    return {
      customerId: c.id,
      low: margins.length ? Math.min(...margins) : undefined,
      high: margins.length ? Math.max(...margins) : undefined,
    };
  });
}

// Commercial summary ----------------------------------------------------------------------

/** Share of contract value by key, largest first, with top-five share and HHI. */
export function concentration(items: { key: string; value: number }[]) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  const shares = items
    .filter((i) => i.value > 0)
    .map((i) => ({ ...i, share: total ? i.value / total : 0 }))
    .sort((a, b) => b.value - a.value);
  return {
    total,
    shares,
    topFiveShare: shares.slice(0, 5).reduce((sum, s) => sum + s.share, 0),
    /** Herfindahl-Hirschman index, 0 to 10,000; above 2,500 is highly concentrated. */
    hhi: Math.round(shares.reduce((sum, s) => sum + (s.share * 100) ** 2, 0)),
  };
}

const DAY = 86_400_000;

export const renewalWindows = [
  { id: "90", label: "Next 90 days", from: 0, to: 90 },
  { id: "180", label: "91 to 180 days", from: 91, to: 180 },
  { id: "365", label: "181 to 365 days", from: 181, to: 365 },
] as const;

/** Contract value renewing by window, with the value at risk (spec §22). */
export function renewalPipeline(
  contracts: Contract[],
  customers: Customer[],
  fx: FxRates,
  now: Iso,
) {
  const health = new Map(customers.map((c) => [c.id, c.health]));
  return renewalWindows.map((w) => {
    const due = contracts.filter((c) => {
      if (c.status !== "active" && c.status !== "renewing") return false;
      const days = Math.ceil((Date.parse(c.endsAt) - Date.parse(now)) / DAY);
      return days >= w.from && days <= w.to;
    });
    const atRisk = due.filter((c) => {
      const h = health.get(c.customerId);
      return h === "at_risk" || h === "critical";
    });
    const value = (list: Contract[]) =>
      list.reduce((sum, c) => sum + toGbp(c.annualContractValue, fx), 0);
    return { ...w, contracts: due, value: value(due), atRiskValue: value(atRisk) };
  });
}
