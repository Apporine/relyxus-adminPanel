import type { CloudCostLine, CostSource, FxRates, LaborRates, ServiceTime } from "@/domain/types";

/**
 * Finance inputs for cost to serve (spec §22). September 2026 is the last complete
 * month; its cloud lines reconcile to the product cost snapshots and its support hours
 * to the product support hours. Customer-hosted Relyxus costs exclude the customer's own
 * cloud bill, which Apporine cannot see.
 */

export const COST_MONTH = "2026-09";

export const fxRates: FxRates = {
  source: "Finance-approved month-end rates",
  asOf: "2026-09-30T00:00:00Z",
  toGbp: { GBP: 1, USD: 0.79, EUR: 0.86 },
};

export const laborRates: LaborRates = {
  source: "Approved blended rates, FY2026",
  supportPerHour: { amountMinor: 7_800, currency: "GBP" },
  operationsPerHour: { amountMinor: 9_200, currency: "GBP" },
};

const gbp = (pounds: number) => ({ amountMinor: pounds * 100, currency: "GBP" as const });

const line = (
  account: string,
  service: string,
  pounds: number,
  scope: { productId?: string; customerId?: string } = {},
): CloudCostLine => ({
  month: COST_MONTH,
  account,
  service,
  tag: scope.customerId ? "customer" : scope.productId ? "product" : "untagged",
  ...scope,
  amount: gbp(pounds),
});

const relyxus = { productId: "prd_relyxus" };
const sentinel = { productId: "prd_sentinel" };

export const cloudCostLines: CloudCostLine[] = [
  // Relyxus: £20,880 in September.
  line("apporine-control-plane-prod", "Control plane compute and database", 7_400, relyxus),
  line("apporine-control-plane-prod", "License service and artifact registry", 3_180, relyxus),
  line("apporine-build", "Release pipeline and conformance clusters", 2_950, relyxus),
  line("apporine-observability", "Logging and metrics", 1_900, relyxus),
  line("apporine-support-labs", "Halden Mutual reproduction environment", 1_150, {
    ...relyxus,
    customerId: "cus_halden",
  }),
  line("apporine-support-labs", "Corvane Bank reproduction environment", 980, {
    ...relyxus,
    customerId: "cus_corvane",
  }),
  line("apporine-support-labs", "Qadira Exchange reproduction environment", 1_320, {
    ...relyxus,
    customerId: "cus_qadira",
  }),
  line("apporine-shared-network", "Shared networking and egress", 2_000),
  // Sentinel: £9,860 in September.
  line("apporine-sentinel-tenants", "Meridian Clearing managed tenant", 6_420, {
    ...sentinel,
    customerId: "cus_meridian",
  }),
  line("apporine-sentinel-tenants", "Vantage Retail Group pilot tenant", 1_640, {
    ...sentinel,
    customerId: "cus_vantage",
  }),
  line("apporine-sentinel-shared", "Sentinel shared services", 1_200, sentinel),
  line("apporine-sentinel-shared", "Untagged snapshots and storage", 600),
];

const time = (customerId: string, supportHours: number, operationsHours: number): ServiceTime => ({
  month: COST_MONTH,
  customerId,
  supportHours,
  operationsHours,
});

/** 310 support hours in September, matching the product totals. */
export const serviceTime: ServiceTime[] = [
  time("cus_northwind", 34, 6),
  time("cus_halden", 38, 4),
  time("cus_corvane", 29, 5),
  time("cus_meridian", 40, 22),
  time("cus_atlas", 21, 3),
  time("cus_brightwater", 14, 10),
  time("cus_kestrel", 9, 12),
  time("cus_orbis", 18, 3),
  time("cus_tamsin", 17, 2),
  time("cus_larkspur", 16, 8),
  time("cus_vantage", 22, 4),
  time("cus_vantage_eu", 6, 7),
  time("cus_solent", 4, 6),
  time("cus_qadira", 27, 5),
  time("cus_harbour", 9, 2),
  time("cus_fenwick", 6, 1),
  time("cus_northwind_uk", 0, 2),
];

export const costSources: CostSource[] = [
  {
    id: "aws_cur",
    name: "Apporine cloud cost",
    system: "AWS Cost and Usage Report",
    covers: "Cloud cost by account and tags",
    state: "delayed",
    lastSyncedAt: "2026-10-10T04:00:00Z",
  },
  {
    id: "support_time",
    name: "Support and operations time",
    system: "Jira Service Management time tracking",
    covers: "Approved time records per customer",
    state: "current",
    lastSyncedAt: "2026-10-12T22:00:00Z",
  },
  {
    id: "contracts",
    name: "Contract value",
    system: "Control plane contract records",
    covers: "Annual and total contract value",
    state: "current",
    lastSyncedAt: "2026-10-13T09:00:00Z",
  },
  {
    id: "finance",
    name: "Invoices and payments",
    system: "NetSuite",
    covers: "Invoice references and payment status",
    state: "unavailable",
    lastSyncedAt: "2026-10-11T08:00:00Z",
  },
];
