import { daysUntil } from "@/lib/format";
import { sumByCurrency } from "./money";
import type {
  ApprovalRequest,
  Contract,
  CostSnapshot,
  Customer,
  Deployment,
  HealthSnapshot,
  HealthStatus,
  License,
  LifecycleStage,
  Money,
  Priority,
  Region,
  Release,
  Segment,
  Task,
} from "./types";

// Filters --------------------------------------------------------------------------------

export type DateRange = "3m" | "6m";

export interface PortfolioFilters {
  product?: string;
  segment?: Segment;
  stage?: LifecycleStage;
  region?: Region;
  owner?: string;
  risk?: HealthStatus;
  range: DateRange;
}

type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

export const segments = ["enterprise", "mid_market", "public_sector"] as const;
export const regions = ["UK", "EU", "North America", "Middle East", "APAC"] as const;
export const healthStatuses = ["healthy", "watch", "at_risk", "critical"] as const;
export const lifecycleStages = [
  "commercial_handoff",
  "security_review",
  "architecture_discovery",
  "pilot_ready",
  "deployment_ready",
  "go_live",
  "stable",
  "renewal",
  "offboarding",
] as const;

/** Reads filters from URL search params, ignoring anything unrecognised. */
export function parsePortfolioFilters(
  params: RawParams,
  known: { productIds: string[]; staffIds: string[] },
): PortfolioFilters {
  return {
    product: pick(one(params.product), known.productIds),
    segment: pick(one(params.segment), segments),
    stage: pick(one(params.stage), lifecycleStages),
    region: pick(one(params.region), regions),
    owner: pick(one(params.owner), known.staffIds),
    risk: pick(one(params.risk), healthStatuses),
    range: one(params.range) === "3m" ? "3m" : "6m",
  };
}

export function isFiltered(filters: PortfolioFilters): boolean {
  const { range: _range, ...rest } = filters;
  return Object.values(rest).some(Boolean);
}

export function filterCustomers(customers: Customer[], filters: PortfolioFilters): Customer[] {
  return customers.filter(
    (c) =>
      (!filters.product || c.productIds.includes(filters.product)) &&
      (!filters.segment || c.segment === filters.segment) &&
      (!filters.stage || c.lifecycleStage === filters.stage) &&
      (!filters.region || c.region === filters.region) &&
      (!filters.owner || Object.values(c.owners).includes(filters.owner)) &&
      (!filters.risk || c.health === filters.risk),
  );
}

// Summary --------------------------------------------------------------------------------

export interface RenewalWindow {
  label: string;
  /** Upper bound in days, inclusive. */
  withinDays: 30 | 60 | 90 | 120;
  count: number;
  value: Money[];
}

export interface LicenseRisk {
  expiring: number;
  grace: number;
  suspended: number;
  verificationFailed: number;
  drift: number;
  total: number;
}

export interface HealthBucket {
  status: HealthStatus;
  count: number;
  value: Money[];
}

export interface ReleaseExposure {
  releaseId: string;
  version: string;
  status: Release["status"];
  endOfSupportAt?: string;
  customers: number;
  deployments: number;
  /** End of support has passed or falls within 90 days. */
  atRisk: boolean;
}

export interface CostPoint {
  month: string;
  byProduct: Record<string, number>;
  total: number;
  supportHours: number;
}

export interface PortfolioSummary {
  customerCount: number;
  activeCustomers: number;
  newThisMonth: number;
  onboarding: number;
  annualContractValue: Money[];
  renewals: RenewalWindow[];
  renewalCount: number;
  renewalValue: Money[];
  productionDeployments: number;
  unsupportedProduction: number;
  licenseRisk: LicenseRisk;
  pendingApprovals: number;
  highImpactApprovals: number;
  oldestApprovalDays: number;
  health: HealthBucket[];
  valueAtRisk: Money[];
  releaseExposure: ReleaseExposure[];
  costTrend: CostPoint[];
  inbox: Task[];
}

export interface PortfolioInput {
  customers: Customer[];
  contracts: Contract[];
  licenses: License[];
  deployments: Deployment[];
  releases: Release[];
  approvals: ApprovalRequest[];
  tasks: Task[];
  costs: CostSnapshot[];
  now: string;
}

const priorityRank: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const DAY_MS = 86_400_000;

export function buildPortfolioSummary(
  input: PortfolioInput,
  filters: PortfolioFilters,
): PortfolioSummary {
  const { now } = input;
  const customers = filterCustomers(input.customers, filters);
  const ids = new Set(customers.map((c) => c.id));
  const inProduct = (productId: string) => !filters.product || productId === filters.product;

  const contracts = input.contracts.filter((c) => ids.has(c.customerId));
  const licenses = input.licenses.filter((l) => ids.has(l.customerId) && inProduct(l.productId));
  const deployments = input.deployments.filter(
    (d) => ids.has(d.customerId) && inProduct(d.productId),
  );
  const releasesByVersion = new Map(input.releases.map((r) => [`${r.productId}:${r.version}`, r]));

  const nowMonth = now.slice(0, 7);
  const active = customers.filter((c) => c.status === "active");

  // Renewals in 120 days, bucketed by the first window each contract falls into.
  const windows: RenewalWindow[] = ([30, 60, 90, 120] as const).map((withinDays) => ({
    label: `${withinDays} days`,
    withinDays,
    count: 0,
    value: [],
  }));
  const renewing = contracts.filter((c) => {
    const days = daysUntil(c.endsAt, now);
    return days >= 0 && days <= 120;
  });
  for (const window of windows) {
    const lower = window.withinDays - 30;
    const inWindow = renewing.filter((c) => {
      const days = daysUntil(c.endsAt, now);
      return days > lower && days <= window.withinDays;
    });
    window.count = inWindow.length;
    window.value = sumByCurrency(inWindow.map((c) => c.annualContractValue));
  }

  const production = deployments.filter((d) => d.environment === "production");
  const unsupportedProduction = production.filter((d) => {
    const release = releasesByVersion.get(`${d.productId}:${d.releaseVersion}`);
    return d.supportState === "unsupported" || release?.status === "end_of_support";
  }).length;

  const licenseRisk: LicenseRisk = {
    expiring: licenses.filter((l) => l.state === "active" && daysUntil(l.expiresAt, now) <= 60)
      .length,
    grace: licenses.filter((l) => l.state === "grace").length,
    suspended: licenses.filter((l) => l.state === "suspended").length,
    verificationFailed: licenses.filter((l) => l.state === "verification_failed").length,
    drift: new Set(
      deployments.filter((d) => d.supportState === "license_mismatch").map((d) => d.licenseId),
    ).size,
    total: 0,
  };
  licenseRisk.total =
    licenseRisk.expiring +
    licenseRisk.grace +
    licenseRisk.suspended +
    licenseRisk.verificationFailed +
    licenseRisk.drift;

  const pending = input.approvals.filter(
    (a) => a.state === "pending" && (!a.customerId || ids.has(a.customerId)),
  );
  const oldestApprovalDays = pending.reduce(
    (max, a) => Math.max(max, Math.floor((Date.parse(now) - Date.parse(a.createdAt)) / DAY_MS)),
    0,
  );

  const health: HealthBucket[] = (["healthy", "watch", "at_risk", "critical"] as const).map(
    (status) => {
      const group = customers.filter((c) => c.health === status);
      return {
        status,
        count: group.length,
        value: sumByCurrency(group.map((c) => c.annualContractValue)),
      };
    },
  );

  const releaseExposure: ReleaseExposure[] = input.releases
    .filter((r) => inProduct(r.productId))
    .map((r) => {
      const onRelease = deployments.filter(
        (d) => d.productId === r.productId && d.releaseVersion === r.version,
      );
      const eosDays = r.endOfSupportAt ? daysUntil(r.endOfSupportAt, now) : undefined;
      return {
        releaseId: r.id,
        version: r.version,
        status: r.status,
        endOfSupportAt: r.endOfSupportAt,
        customers: new Set(onRelease.map((d) => d.customerId)).size,
        deployments: onRelease.length,
        atRisk: eosDays !== undefined && eosDays <= 90,
      };
    })
    .filter((r) => r.deployments > 0);

  const months = [...new Set(input.costs.map((c) => c.month))]
    .sort()
    .slice(filters.range === "3m" ? -3 : -6);
  const costTrend: CostPoint[] = months.map((month) => {
    const rows = input.costs.filter((c) => c.month === month && inProduct(c.productId));
    const byProduct = Object.fromEntries(rows.map((r) => [r.productId, r.cloudCost.amountMinor]));
    return {
      month,
      byProduct,
      total: rows.reduce((sum, r) => sum + r.cloudCost.amountMinor, 0),
      supportHours: rows.reduce((sum, r) => sum + r.supportHours, 0),
    };
  });

  const inbox = input.tasks
    .filter((t) => !t.customerId || ids.has(t.customerId))
    .sort(
      (a, b) =>
        priorityRank[a.priority] - priorityRank[b.priority] || a.dueAt.localeCompare(b.dueAt),
    );

  return {
    customerCount: customers.length,
    activeCustomers: active.length,
    newThisMonth: customers.filter((c) => c.customerSince.slice(0, 7) === nowMonth).length,
    onboarding: customers.filter((c) => c.status === "onboarding").length,
    annualContractValue: sumByCurrency(active.map((c) => c.annualContractValue)),
    renewals: windows,
    renewalCount: renewing.length,
    renewalValue: sumByCurrency(renewing.map((c) => c.annualContractValue)),
    productionDeployments: production.length,
    unsupportedProduction,
    licenseRisk,
    pendingApprovals: pending.length,
    highImpactApprovals: pending.filter((a) => a.highImpact).length,
    oldestApprovalDays,
    health,
    valueAtRisk: sumByCurrency(
      customers
        .filter((c) => c.health === "at_risk" || c.health === "critical")
        .map((c) => c.annualContractValue),
    ),
    releaseExposure,
    costTrend,
    inbox,
  };
}

/** Health history limited to the selected range. */
export function healthTrend(history: HealthSnapshot[], range: DateRange): HealthSnapshot[] {
  return history.slice(range === "3m" ? -3 : -6);
}
