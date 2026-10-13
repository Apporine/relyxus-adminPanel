import {
  completeness,
  dataQualityIssues,
  duplicateSuggestions,
  nameSimilarity,
  requiredOwners,
} from "./data-quality";
import type { Contact, Customer, Deployment } from "./types";

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
    website: "https://example.test",
    lifecycleStage: "stable",
    customerSince: "2024-01-01T00:00:00Z",
    health: "healthy",
    supportTier: "standard",
    owners: {
      commercial_owner: "stf_02",
      technical_owner: "stf_04",
      customer_success_owner: "stf_03",
      support_owner: "stf_08",
      executive_sponsor: "stf_09",
    },
    productIds: ["prd_a"],
    deploymentModel: "customer_hosted",
    dataResidency: "United Kingdom",
    lastActivityAt: "2026-10-01T00:00:00Z",
    references: { crmId: "CRM-1", financeId: "FIN-1" },
    nextRenewalAt: "2027-01-01T00:00:00Z",
    ...overrides,
  };
}

const contact = (id: string, customerId: string, overrides: Partial<Contact> = {}): Contact => ({
  id,
  customerId,
  name: id,
  title: "CTO",
  email: `${id}@example.test`,
  roles: ["executive", "technical", "security"],
  timezone: "Europe/London",
  preferredChannel: "email",
  active: true,
  verified: true,
  ...overrides,
});

const base = {
  now: "2026-10-13T09:00:00Z",
  contacts: [],
  contracts: [],
  licenses: [],
  deployments: [],
  entitlements: [],
  incoming: [],
  syncs: [],
};

describe("owners and completeness", () => {
  it("needs more owners at later stages", () => {
    expect(requiredOwners("commercial_handoff")).toEqual(["commercial_owner", "technical_owner"]);
    expect(requiredOwners("stable")).toContain("executive_sponsor");
  });

  it("explains completeness by listing every required field", () => {
    const c = customer("a", { owners: { commercial_owner: "stf_02" }, nextRenewalAt: undefined });
    const result = completeness(c, { contacts: [contact("x", "a")], contracts: [] });
    expect(result.fields.filter((f) => !f.present).map((f) => f.field)).toEqual([
      "Owner: technical owner",
      "Owner: customer success owner",
      "Owner: support owner",
      "Owner: executive sponsor",
      "Contract record",
      "Renewal date",
    ]);
    expect(result.score).toBe(Math.round((9 / 15) * 100));
  });
});

describe("duplicates", () => {
  it("ignores legal suffixes and skips linked accounts", () => {
    expect(nameSimilarity("Northwind Payments Ltd", "Northwind Payments Limited")).toBe(1);
    expect(nameSimilarity("Northwind Payments", "Southwind Payments")).toBeLessThan(1);
    const parent = customer("a", { legalName: "Vantage Retail Group plc" });
    const child = customer("b", { legalName: "Vantage Retail Europe BV", parentId: "a" });
    const unlinked = customer("c", { legalName: "Vantage Retail Ltd" });
    expect(duplicateSuggestions([parent, child])).toEqual([]);
    expect(duplicateSuggestions([parent, unlinked]).map((d) => d.b.id)).toEqual(["c"]);
  });

  it("matches incoming CRM records", () => {
    const suggestions = duplicateSuggestions(
      [customer("a", { legalName: "Halden Mutual Ltd" })],
      [{ name: "Halden Mutual Limited", source: "Salesforce", reference: "CRM-9" }],
    );
    expect(suggestions[0]?.b.source).toBe("Salesforce CRM-9");
  });
});

describe("checks", () => {
  it("flags missing owners, key contacts, orphaned deployments and stale syncs", () => {
    const orphan = { id: "dep_1", customerId: "a", licenseId: "LIC_9" } as Deployment;
    const issues = dataQualityIssues({
      ...base,
      customers: [customer("a", { owners: { commercial_owner: "stf_02" } })],
      contacts: [contact("x", "a", { active: false })],
      deployments: [orphan],
      syncs: [{ system: "Salesforce", lastSyncedAt: "2026-10-11T06:00:00Z", staleAfterHours: 24 }],
    });
    expect(issues.map((i) => i.check)).toEqual([
      "missing_owner",
      "inactive_contact",
      "orphaned_deployment",
      "stale_external_reference",
    ]);
    expect(issues[2]?.detail).toBe("License LIC_9 not found.");
  });
});
