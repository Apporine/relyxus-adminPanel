import { sumByCurrency } from "./money";
import {
  buildPortfolioSummary,
  filterCustomers,
  healthTrend,
  isFiltered,
  parsePortfolioFilters,
  type PortfolioInput,
} from "./portfolio";
import type {
  ApprovalRequest,
  Contract,
  Customer,
  Deployment,
  License,
  Money,
  Release,
  Task,
} from "./types";
import { contractRecord, deploymentMetadata, releaseRecord } from "@/test/builders";

const NOW = "2026-10-13T09:00:00Z";
const gbp = (k: number): Money => ({ amountMinor: k * 100_000, currency: "GBP" });
const eur = (k: number): Money => ({ amountMinor: k * 100_000, currency: "EUR" });

function customer(id: string, overrides: Partial<Customer> = {}): Customer {
  return {
    id,
    displayName: id,
    legalName: id,
    status: "active",
    segment: "enterprise",
    industry: "Banking",
    headquartersCountry: "United Kingdom",
    region: "UK",
    website: "https://example.com",
    lifecycleStage: "stable",
    customerSince: "2025-01-01T00:00:00Z",
    health: "healthy",
    annualContractValue: gbp(100),
    supportTier: "standard",
    owners: { commercial_owner: "stf_02" },
    productIds: ["prd_a"],
    deploymentModel: "customer_hosted",
    dataResidency: "UK",
    lastActivityAt: NOW,
    references: {},
    ...overrides,
  };
}

function contract(customerId: string, endsAt: string, value = gbp(100)): Contract {
  return {
    id: `ctr_${customerId}`,
    number: "APC-1",
    customerId,
    productIds: ["prd_a"],
    status: "active",
    effectiveAt: "2025-10-01T00:00:00Z",
    endsAt,
    noticeDays: 60,
    renewalType: "manual",
    ...contractRecord,
    annualContractValue: value,
    billingFrequency: "annual",
    renewalStage: "not_started",
    renewalOwnerId: "stf_02",
  };
}

function license(
  customerId: string,
  state: License["state"],
  expiresAt = "2027-06-01T00:00:00Z",
): License {
  return {
    id: `LIC_${customerId}`,
    customerId,
    productId: "prd_a",
    contractId: `ctr_${customerId}`,
    state,
    validFrom: "2025-10-01T00:00:00Z",
    expiresAt,
    graceDays: 30,
    deploymentAllowance: 2,
    deliveryState: "acknowledged",
    artifactFingerprint: "SHA256:00",
    revisions: [],
  };
}

function deployment(customerId: string, overrides: Partial<Deployment> = {}): Deployment {
  return {
    ...deploymentMetadata,
    id: `dep_${customerId}_${overrides.environment ?? "production"}`,
    customerId,
    productId: "prd_a",
    logicalName: customerId,
    environment: "production",
    platform: "AWS",
    kubernetes: "EKS 1.31",
    region: "eu-west-2",
    releaseVersion: "2.0.0",
    licenseId: `LIC_${customerId}`,
    supportState: "supported",
    technicalOwnerId: "stf_04",
    ...overrides,
  };
}

const releases: Release[] = [
  {
    id: "rel_2",
    productId: "prd_a",
    version: "2.0.0",
    status: "released",
    endOfSupportAt: "2027-09-01T00:00:00Z",
    ociDigest: "",
    helmChartVersion: "2.0.0",
    ...releaseRecord,
  },
  {
    id: "rel_1",
    productId: "prd_a",
    version: "1.0.0",
    status: "end_of_support",
    endOfSupportAt: "2026-09-30T00:00:00Z",
    ociDigest: "",
    helmChartVersion: "1.0.0",
    ...releaseRecord,
  },
];

function approval(id: string, overrides: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    id,
    type: "license_renew",
    state: "pending",
    highImpact: false,
    requesterId: "stf_01",
    excludedApproverIds: ["stf_01"],
    approverIds: ["stf_05"],
    targetType: "license",
    targetId: "LIC_a",
    title: id,
    reason: "",
    impact: [],
    diff: [],
    policy: [],
    requiresStepUp: false,
    createdAt: "2026-10-10T09:00:00Z",
    expiresAt: "2026-10-20T09:00:00Z",
    ...overrides,
  };
}

const task = (
  id: string,
  priority: Task["priority"],
  dueAt: string,
  customerId?: string,
): Task => ({
  id,
  kind: "renewal",
  title: id,
  priority,
  customerId,
  ownerId: "stf_01",
  dueAt,
  href: "/",
});

function input(overrides: Partial<PortfolioInput> = {}): PortfolioInput {
  return {
    customers: [
      customer("a", { health: "healthy", customerSince: "2026-10-02T00:00:00Z" }),
      customer("b", { health: "at_risk", annualContractValue: eur(200), region: "EU" }),
      customer("c", { health: "critical", status: "onboarding", annualContractValue: undefined }),
    ],
    contracts: [
      contract("a", "2026-10-30T00:00:00Z"), // 17 days
      contract("b", "2027-01-20T00:00:00Z", eur(200)), // 99 days
    ],
    licenses: [license("a", "active", "2026-11-20T00:00:00Z"), license("b", "grace")],
    deployments: [
      deployment("a"),
      deployment("a", { environment: "staging", supportState: "license_mismatch" }),
      deployment("b", { releaseVersion: "1.0.0", supportState: "unsupported" }),
    ],
    releases,
    approvals: [
      approval("apr_1"),
      approval("apr_2", { highImpact: true, createdAt: "2026-10-03T09:00:00Z", customerId: "b" }),
      approval("apr_3", { state: "approved" }),
    ],
    tasks: [
      task("t_low", "low", "2026-10-14T00:00:00Z"),
      task("t_crit_late", "critical", "2026-10-20T00:00:00Z", "a"),
      task("t_crit_soon", "critical", "2026-10-15T00:00:00Z", "b"),
    ],
    costs: ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"].flatMap(
      (month, i) => [
        { month, productId: "prd_a", cloudCost: gbp(10 + i), supportHours: 10 },
        { month, productId: "prd_b", cloudCost: gbp(1), supportHours: 2 },
      ],
    ),
    now: NOW,
    ...overrides,
  };
}

const noFilters = { range: "6m" as const };

describe("sumByCurrency", () => {
  it("totals per currency without converting, largest first", () => {
    expect(sumByCurrency([gbp(1), eur(5), gbp(2), undefined])).toEqual([eur(5), gbp(3)]);
  });
});

describe("parsePortfolioFilters", () => {
  const known = { productIds: ["prd_a"], staffIds: ["stf_02"] };

  it("accepts known values and ignores unknown ones", () => {
    expect(
      parsePortfolioFilters(
        {
          product: "prd_a",
          segment: "enterprise",
          region: "Mars",
          risk: ["at_risk"],
          owner: "stf_99",
          range: "3m",
        },
        known,
      ),
    ).toEqual({
      product: "prd_a",
      segment: "enterprise",
      stage: undefined,
      region: undefined,
      owner: undefined,
      risk: "at_risk",
      range: "3m",
    });
  });

  it("defaults to six months", () => {
    expect(parsePortfolioFilters({}, known).range).toBe("6m");
    expect(isFiltered(parsePortfolioFilters({ range: "3m" }, known))).toBe(false);
    expect(isFiltered(parsePortfolioFilters({ segment: "mid_market" }, known))).toBe(true);
  });
});

describe("filterCustomers", () => {
  it("combines filters", () => {
    const { customers } = input();
    expect(filterCustomers(customers, { ...noFilters, region: "EU" }).map((c) => c.id)).toEqual([
      "b",
    ]);
    expect(
      filterCustomers(customers, { ...noFilters, owner: "stf_02", risk: "critical" }).map(
        (c) => c.id,
      ),
    ).toEqual(["c"]);
  });
});

describe("buildPortfolioSummary", () => {
  const summary = buildPortfolioSummary(input(), noFilters);

  it("counts customers and keeps contract value per currency", () => {
    expect(summary).toMatchObject({
      customerCount: 3,
      activeCustomers: 2,
      onboarding: 1,
      newThisMonth: 1,
    });
    expect(summary.annualContractValue).toEqual([eur(200), gbp(100)]);
  });

  it("buckets renewals into 30, 60, 90 and 120 day windows", () => {
    expect(summary.renewals.map((w) => w.count)).toEqual([1, 0, 0, 1]);
    expect(summary.renewalCount).toBe(2);
    expect(summary.renewals[3]?.value).toEqual([eur(200)]);
  });

  it("counts production deployments on unsupported releases", () => {
    expect(summary.productionDeployments).toBe(2);
    expect(summary.unsupportedProduction).toBe(1);
  });

  it("breaks license risk into its categories", () => {
    expect(summary.licenseRisk).toEqual({
      expiring: 1,
      grace: 1,
      suspended: 0,
      verificationFailed: 0,
      drift: 1,
      total: 3,
    });
  });

  it("summarises pending approvals", () => {
    expect(summary).toMatchObject({
      pendingApprovals: 2,
      highImpactApprovals: 1,
      oldestApprovalDays: 10,
    });
  });

  it("reports health counts with value exposure", () => {
    expect(summary.health.map((h) => h.count)).toEqual([1, 0, 1, 1]);
    expect(summary.valueAtRisk).toEqual([eur(200)]);
  });

  it("marks releases at or near end of support", () => {
    expect(summary.releaseExposure).toEqual([
      expect.objectContaining({ version: "2.0.0", deployments: 2, customers: 1, atRisk: false }),
      expect.objectContaining({ version: "1.0.0", deployments: 1, customers: 1, atRisk: true }),
    ]);
  });

  it("orders the inbox by priority, then due date", () => {
    expect(summary.inbox.map((t) => t.id)).toEqual(["t_crit_soon", "t_crit_late", "t_low"]);
  });

  it("limits the cost trend to the selected range", () => {
    expect(summary.costTrend).toHaveLength(6);
    expect(buildPortfolioSummary(input(), { range: "3m" }).costTrend.map((p) => p.month)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(summary.costTrend[0]).toMatchObject({ total: gbp(11).amountMinor, supportHours: 12 });
  });

  it("scopes every widget to the filtered customers and product", () => {
    const eu = buildPortfolioSummary(input(), { ...noFilters, region: "EU" });
    expect(eu.customerCount).toBe(1);
    expect(eu.renewalCount).toBe(1);
    expect(eu.licenseRisk.grace).toBe(1);
    expect(eu.licenseRisk.expiring).toBe(0);
    expect(eu.inbox.map((t) => t.id)).toEqual(["t_crit_soon", "t_low"]);
    expect(eu.pendingApprovals).toBe(2);

    const productB = buildPortfolioSummary(input(), { ...noFilters, product: "prd_b" });
    expect(productB.customerCount).toBe(0);
    expect(productB.costTrend[0]?.total).toBe(gbp(1).amountMinor);
  });
});

describe("healthTrend", () => {
  it("returns the last three or six months", () => {
    const history = Array.from({ length: 6 }, (_, i) => ({
      month: `m${i}`,
      healthy: i,
      watch: 0,
      atRisk: 0,
      critical: 0,
    }));
    expect(healthTrend(history, "3m").map((h) => h.month)).toEqual(["m3", "m4", "m5"]);
    expect(healthTrend(history, "6m")).toHaveLength(6);
  });
});
