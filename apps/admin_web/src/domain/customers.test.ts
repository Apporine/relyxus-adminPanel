import {
  buildCustomerRows,
  canViewCommercial,
  filterCustomerRows,
  findSuspectedDuplicates,
  normaliseName,
  parseCustomerFilters,
  sortCustomerRows,
  worstLicenseState,
  type CustomerRow,
} from "./customers";
import type { Customer } from "./types";

const NOW = "2026-10-13T09:00:00Z";

function customer(id: string, overrides: Partial<Customer> = {}): Customer {
  return {
    id,
    displayName: id,
    legalName: `${id} Ltd`,
    status: "active",
    segment: "enterprise",
    industry: "Banking",
    headquartersCountry: "United Kingdom",
    region: "UK",
    website: "https://example.com",
    lifecycleStage: "stable",
    customerSince: "2025-01-01T00:00:00Z",
    health: "healthy",
    supportTier: "standard",
    owners: {},
    productIds: ["prd_a"],
    deploymentModel: "customer_hosted",
    dataResidency: "UK",
    lastActivityAt: NOW,
    references: {},
    ...overrides,
  };
}

describe("canViewCommercial", () => {
  it("allows commercial and finance roles only", () => {
    expect(canViewCommercial({ roles: ["finance_viewer"] })).toBe(true);
    expect(canViewCommercial({ roles: ["commercial_operations"] })).toBe(true);
    expect(canViewCommercial({ roles: ["support_engineer", "release_manager"] })).toBe(false);
  });
});

describe("worstLicenseState", () => {
  it("returns the most severe state", () => {
    expect(worstLicenseState([{ state: "active" }, { state: "grace" }])).toBe("grace");
    expect(
      worstLicenseState([
        { state: "active" },
        { state: "verification_failed" },
        { state: "suspended" },
      ]),
    ).toBe("verification_failed");
    expect(worstLicenseState([])).toBeUndefined();
  });
});

describe("duplicates", () => {
  it("normalises legal suffixes and punctuation", () => {
    expect(normaliseName("Northwind Payments Limited")).toBe("northwind payments");
    expect(normaliseName("Northwind Payments UK")).toBe("northwind payments");
    expect(normaliseName("Orbis Telecommunications SA")).toBe("orbis telecommunications");
  });

  it("flags the newer record and ignores parent and subsidiary pairs", () => {
    const customers = [
      customer("old", { displayName: "Northwind Payments", legalName: "Northwind Payments Ltd" }),
      customer("new", {
        displayName: "Northwind Payments UK",
        legalName: "Northwind Payments Limited",
        customerSince: "2026-10-09T00:00:00Z",
      }),
      customer("parent", { displayName: "Vantage Retail", legalName: "Vantage Retail plc" }),
      customer("child", {
        displayName: "Vantage Retail",
        legalName: "Vantage Retail BV",
        parentId: "parent",
        customerSince: "2026-08-01T00:00:00Z",
      }),
      customer("abroad", {
        displayName: "Northwind Payments",
        legalName: "Northwind Payments Inc",
        headquartersCountry: "United States",
        customerSince: "2026-09-01T00:00:00Z",
      }),
    ];
    expect([...findSuspectedDuplicates(customers).entries()]).toEqual([["new", "old"]]);
  });
});

describe("customer rows", () => {
  const rows = buildCustomerRows({
    customers: [
      customer("alpha", {
        displayName: "Alpha Bank",
        health: "at_risk",
        region: "EU",
        nextRenewalAt: "2026-11-12T09:00:00Z",
        owners: { commercial_owner: "stf_02" },
        annualContractValue: { amountMinor: 10_000_000, currency: "GBP" },
      }),
      customer("beta", {
        displayName: "Beta Insurance",
        status: "onboarding",
        productIds: ["prd_b"],
      }),
      customer("gamma", {
        displayName: "Gamma Capital",
        health: "critical",
        nextRenewalAt: "2027-06-01T00:00:00Z",
        annualContractValue: { amountMinor: 50_000_000, currency: "GBP" },
      }),
    ],
    products: [
      {
        id: "prd_a",
        code: "RELYXUS",
        name: "Relyxus",
        status: "active",
        ownerId: "stf_04",
        supportModel: "",
        currentReleaseTrain: "2",
      },
      {
        id: "prd_b",
        code: "SENTINEL",
        name: "Sentinel",
        status: "pilot",
        ownerId: "stf_04",
        supportModel: "",
        currentReleaseTrain: "0",
      },
    ],
    licenses: [
      { customerId: "alpha", state: "grace" },
      { customerId: "alpha", state: "active" },
    ] as never,
    deployments: [
      { customerId: "alpha" },
      { customerId: "alpha" },
      { customerId: "gamma" },
    ] as never,
    now: NOW,
  });
  const owners = { stf_02: "Daniel Price" };
  const ids = (list: CustomerRow[]) => list.map((r) => r.id);

  it("derives products, renewal countdown, license state and deployments", () => {
    expect(rows[0]).toMatchObject({
      productCodes: ["RELYXUS"],
      renewalDays: 30,
      licenseState: "grace",
      deploymentCount: 2,
      commercialOwnerId: "stf_02",
    });
    expect(rows[1]?.licenseState).toBeUndefined();
  });

  it("finds customers by name, ID, owner, product and region", () => {
    expect(ids(filterCustomerRows(rows, { q: "alpha" }, owners))).toEqual(["alpha"]);
    expect(ids(filterCustomerRows(rows, { q: "gamma" }, owners))).toEqual(["gamma"]);
    expect(ids(filterCustomerRows(rows, { q: "daniel" }, owners))).toEqual(["alpha"]);
    expect(ids(filterCustomerRows(rows, { q: "sentinel" }, owners))).toEqual(["beta"]);
    expect(ids(filterCustomerRows(rows, { q: "eu bank" }, owners))).toEqual(["alpha"]);
  });

  it("applies structured filters", () => {
    expect(ids(filterCustomerRows(rows, { q: "", renewal: 30 }, owners))).toEqual(["alpha"]);
    expect(ids(filterCustomerRows(rows, { q: "", status: "onboarding" }, owners))).toEqual([
      "beta",
    ]);
    expect(ids(filterCustomerRows(rows, { q: "", health: "critical" }, owners))).toEqual(["gamma"]);
    expect(ids(filterCustomerRows(rows, { q: "", owner: "stf_02" }, owners))).toEqual(["alpha"]);
    expect(ids(filterCustomerRows(rows, { q: "", product: "prd_b" }, owners))).toEqual(["beta"]);
  });

  it("sorts by risk, renewal and value", () => {
    expect(ids(sortCustomerRows(rows, "health", "ascending"))).toEqual(["gamma", "alpha", "beta"]);
    expect(ids(sortCustomerRows(rows, "renewal", "ascending"))).toEqual(["alpha", "gamma", "beta"]);
    expect(ids(sortCustomerRows(rows, "value", "descending"))).toEqual(["gamma", "alpha", "beta"]);
    expect(ids(sortCustomerRows(rows, "name", "descending"))).toEqual(["gamma", "beta", "alpha"]);
    expect(ids(sortCustomerRows(rows, "deployments", "descending"))).toEqual([
      "alpha",
      "gamma",
      "beta",
    ]);
  });
});

describe("parseCustomerFilters", () => {
  const known = { productIds: ["prd_a"], staffIds: ["stf_02"] };

  it("reads known parameters and ignores the rest", () => {
    expect(
      parseCustomerFilters(
        { q: "north", health: "at_risk", renewal: "60", region: "Mars", owner: "stf_99" },
        known,
      ),
    ).toMatchObject({
      q: "north",
      health: "at_risk",
      renewal: 60,
      region: undefined,
      owner: undefined,
    });
  });

  it("applies a saved view", () => {
    expect(parseCustomerFilters({ view: "onboarding", health: "critical" }, known)).toEqual({
      q: "",
      status: "onboarding",
    });
  });
});
