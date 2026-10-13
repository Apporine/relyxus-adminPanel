import {
  concentration,
  economics,
  marginRanges,
  renewalPipeline,
  roundEstimate,
  toGbp,
  type EconomicsInput,
} from "./finance";
import type { CloudCostLine, Contract, Customer, FxRates } from "./types";
import { contractRecord } from "@/test/builders";

const fx: FxRates = {
  source: "Test",
  asOf: "2026-09-30T00:00:00Z",
  toGbp: { GBP: 1, USD: 0.8, EUR: 0.9 },
};

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
    website: "https://example.test",
    lifecycleStage: "stable",
    customerSince: "2024-01-01T00:00:00Z",
    health: "healthy",
    supportTier: "standard",
    owners: {},
    productIds: ["prd_a"],
    deploymentModel: "customer_hosted",
    dataResidency: "United Kingdom",
    lastActivityAt: "2026-10-01T00:00:00Z",
    references: {},
    ...overrides,
  };
}

const gbp = (pounds: number) => ({ amountMinor: pounds * 100, currency: "GBP" as const });
const line = (pounds: number, scope: Partial<CloudCostLine>): CloudCostLine => ({
  month: "2026-09",
  account: "acct",
  service: "svc",
  tag: scope.customerId ? "customer" : scope.productId ? "product" : "untagged",
  amount: gbp(pounds),
  ...scope,
});

const input: EconomicsInput = {
  customers: [
    customer("a", { annualContractValue: gbp(300_000) }),
    customer("b", { annualContractValue: { amountMinor: 12_500_000, currency: "USD" } }),
    customer("c"),
  ],
  lines: [
    line(1_000, { productId: "prd_a" }),
    line(500, { productId: "prd_a", customerId: "a" }),
    line(200, {}),
  ],
  time: [{ month: "2026-09", customerId: "a", supportHours: 10, operationsHours: 1 }],
  labor: {
    source: "Test",
    supportPerHour: gbp(80),
    operationsPerHour: gbp(100),
  },
  fx,
};

describe("conversion and rounding", () => {
  it("converts with the approved rate and rounds estimates to £1,000", () => {
    expect(toGbp({ amountMinor: 10_000, currency: "EUR" }, fx)).toBe(9_000);
    expect(roundEstimate(123_456_78)).toBe(123_000_00);
    expect(roundEstimate(123_500_00)).toBe(124_000_00);
  });
});

describe("economics", () => {
  it("allocates shared product cost by contract value", () => {
    const { rows, unallocatedMonthly } = economics(input, "by_value");
    const [a, b, c] = rows;
    // a: 300k, b: 100k GBP → 3:1 split of £1,000; c has no value.
    expect(a!.monthly.cloud).toBe(50_000 + 75_000);
    expect(b!.monthly.cloud).toBe(25_000);
    expect(c!.monthly.cloud).toBe(0);
    expect(unallocatedMonthly).toBe(20_000);
    expect(a!.monthly.support).toBe(80_000);
    expect(a!.monthly.operations).toBe(10_000);
    expect(a!.annualCost).toBe((125_000 + 90_000) * 12);
    expect(a!.margin).toBe(30_000_000 - (125_000 + 90_000) * 12);
    expect(b).toMatchObject({ converted: true, acvGbp: 10_000_000 });
    expect(c!.margin).toBeUndefined();
  });

  it("splits evenly or keeps shared cost unallocated", () => {
    const even = economics(input, "even").rows;
    expect(even.map((r) => r.monthly.cloud)).toEqual([
      50_000 + 100_000 / 3,
      100_000 / 3,
      100_000 / 3,
    ]);
    const direct = economics(input, "direct");
    expect(direct.rows.map((r) => r.monthly.cloud)).toEqual([50_000, 0, 0]);
    expect(direct.unallocatedMonthly).toBe(120_000);
  });

  it("reports the margin range across views", () => {
    const [a, , c] = marginRanges(input);
    expect(a!.low).toBeLessThan(a!.high!);
    expect(c).toEqual({ customerId: "c", low: undefined, high: undefined });
  });
});

describe("commercial summary", () => {
  it("measures concentration", () => {
    const result = concentration([
      { key: "a", value: 60 },
      { key: "b", value: 40 },
      { key: "c", value: 0 },
    ]);
    expect(result.shares.map((s) => s.key)).toEqual(["a", "b"]);
    expect(result.topFiveShare).toBe(1);
    expect(result.hhi).toBe(5_200);
  });

  it("groups renewals by window with value at risk", () => {
    const contract = (id: string, endsAt: string, customerId: string): Contract => ({
      ...contractRecord,
      id,
      number: id,
      customerId,
      productIds: ["prd_a"],
      status: "active",
      effectiveAt: "2025-01-01T00:00:00Z",
      endsAt,
      noticeDays: 60,
      renewalType: "manual",
      annualContractValue: gbp(100_000),
      billingFrequency: "annual",
      renewalStage: "not_started",
      renewalOwnerId: "stf_02",
    });
    const windows = renewalPipeline(
      [
        contract("k1", "2026-11-01T00:00:00Z", "a"),
        contract("k2", "2027-02-01T00:00:00Z", "b"),
        contract("k3", "2028-01-01T00:00:00Z", "a"),
      ],
      [customer("a", { health: "at_risk" }), customer("b")],
      fx,
      "2026-10-13T09:00:00Z",
    );
    expect(windows.map((w) => [w.id, w.contracts.length, w.value, w.atRiskValue])).toEqual([
      ["90", 1, 10_000_000, 10_000_000],
      ["180", 1, 10_000_000, 0],
      ["365", 0, 0, 0],
    ]);
  });
});
