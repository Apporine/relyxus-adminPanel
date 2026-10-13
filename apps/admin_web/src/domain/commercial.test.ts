import { contractRecord } from "@/test/builders";
import { compareSources, driftReview, entitlementRows, previewChange } from "./entitlements";
import {
  daysToEnd,
  isOpenRenewal,
  nextRenewalAction,
  noticeDeadline,
  noticePassed,
  parseRadarWindow,
  radarWindow,
} from "./renewals";
import type {
  Contract,
  CustomerEntitlement,
  EntitlementDefinition,
  License,
  ObservedEntitlement,
} from "./types";

const now = "2026-10-13T09:00:00Z";

function contract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "ctr_a",
    number: "APC-1",
    customerId: "cus_a",
    productIds: ["prd_a"],
    status: "active",
    effectiveAt: "2025-11-01T00:00:00Z",
    endsAt: "2026-11-30T00:00:00Z",
    noticeDays: 60,
    renewalType: "manual",
    annualContractValue: { currency: "GBP", amountMinor: 100 },
    billingFrequency: "annual",
    renewalStage: "not_started",
    renewalOwnerId: "stf_02",
    ...contractRecord,
    ...overrides,
  };
}

const allowance: EntitlementDefinition = {
  id: "d1",
  productId: "prd_a",
  key: "deployments.production.max",
  label: "Production deployments",
  dataType: "integer",
  validation: "1 to 10",
  defaultValue: "1",
  description: "",
  lifecycle: "active",
  securityClassification: "internal",
  comparison: "allowance",
};
const tier: EntitlementDefinition = {
  ...allowance,
  id: "d2",
  key: "support.tier",
  label: "Support tier",
  dataType: "enum",
  comparison: "exact",
};
const draft: EntitlementDefinition = { ...allowance, id: "d3", key: "seats", lifecycle: "draft" };

describe("drift engine", () => {
  it("finds nothing when every source agrees", () => {
    expect(
      compareSources(allowance, { contract: "2", entitlement: "2", license: "2", observed: "1" }),
    ).toEqual([]);
  });

  it("reports each disagreement once with both values", () => {
    expect(
      compareSources(allowance, { contract: "4", entitlement: "3", license: "2", observed: "3" }),
    ).toEqual([
      {
        kind: "contract_vs_entitlement",
        detail: "Contract says 4; the entitlement record says 3.",
      },
      {
        kind: "entitlement_vs_license",
        detail: "Entitlement is 3; the signed license still says 2.",
      },
      {
        kind: "observed_vs_license",
        detail: "Deployments report 3 production deployments; the license allows 2.",
      },
    ]);
  });

  it("requires an exact match for non-allowance values", () => {
    expect(compareSources(tier, { license: "premium", observed: "standard" })).toEqual([
      {
        kind: "observed_vs_license",
        detail: "Deployments report standard; the license says premium.",
      },
    ]);
  });

  const license = {
    id: "LIC_1",
    customerId: "cus_a",
    productId: "prd_a",
    contractId: "ctr_a",
    revisions: [
      {
        entitlements: [
          { key: "deployments.production.max", label: "", value: "2" },
          { key: "support.tier", label: "", value: "premium" },
        ],
      },
    ],
  } as unknown as License;
  const record = (key: string, value: string): CustomerEntitlement => ({
    id: key,
    customerId: "cus_a",
    productId: "prd_a",
    key,
    value,
    sourceContractId: "ctr_a",
    effectiveAt: now,
    expiresAt: now,
    history: [],
  });
  const observed: ObservedEntitlement[] = [
    {
      customerId: "cus_a",
      productId: "prd_a",
      key: "deployments.production.max",
      value: "3",
      observedAt: now,
      deploymentId: "d",
    },
  ];
  const input = {
    definitions: [allowance, tier, draft],
    contracts: [
      contract({ scope: { "deployments.production.max": "2", "support.tier": "premium" } }),
    ],
    licenses: [license],
    records: [record("deployments.production.max", "2"), record("support.tier", "premium")],
    observed,
  };

  it("builds one row per active definition with its four sources", () => {
    const rows = entitlementRows({
      customerId: "cus_a",
      productId: "prd_a",
      definitions: input.definitions,
      contract: input.contracts[0],
      license,
      records: input.records,
      observed,
    });
    expect(rows.map((r) => r.definition.key)).toEqual([
      "deployments.production.max",
      "support.tier",
    ]);
    expect(rows[0]!.sources).toEqual({
      contract: "2",
      entitlement: "2",
      license: "2",
      observed: "3",
    });
  });

  it("lists drift across customers for review", () => {
    const items = driftReview(input);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      customerId: "cus_a",
      licenseId: "LIC_1",
      findings: [{ kind: "observed_vs_license" }],
    });
  });

  it("previews a change with license impact and usage warning", () => {
    const [row] = entitlementRows({
      customerId: "cus_a",
      productId: "prd_a",
      definitions: [allowance],
      contract: input.contracts[0],
      license,
      records: input.records,
      observed,
    });
    expect(previewChange(row!, "4")).toEqual({
      current: "2",
      proposed: "4",
      source: "ctr_a",
      requiresNewLicenseRevision: true,
      belowObservedUsage: false,
    });
    expect(previewChange(row!, "1").belowObservedUsage).toBe(true);
    expect(previewChange(row!, "2").requiresNewLicenseRevision).toBe(false);
  });
});

describe("renewals", () => {
  it("computes days to end, notice deadline and whether notice passed", () => {
    const c = contract();
    expect(daysToEnd(c, now)).toBe(48);
    expect(noticeDeadline(c)).toBe("2026-10-01T00:00:00.000Z");
    expect(noticePassed(c, now)).toBe(true);
    expect(noticePassed(contract({ noticeDays: 30 }), now)).toBe(false);
  });

  it("buckets contracts into 30, 60, 90 and 120 day windows", () => {
    expect(radarWindow(contract({ endsAt: "2026-10-20T00:00:00Z" }), now)).toBe(30);
    expect(radarWindow(contract(), now)).toBe(60);
    expect(radarWindow(contract({ endsAt: "2027-01-05T00:00:00Z" }), now)).toBe(90);
    expect(radarWindow(contract({ endsAt: "2027-02-05T00:00:00Z" }), now)).toBe(120);
    expect(radarWindow(contract({ endsAt: "2027-06-01T00:00:00Z" }), now)).toBeUndefined();
    expect(radarWindow(contract({ endsAt: "2026-10-01T00:00:00Z" }), now)).toBeUndefined();
  });

  it("names the next action from stage and notice", () => {
    expect(nextRenewalAction(contract(), now)).toBe(
      "Notice deadline passed: confirm renewal terms now",
    );
    expect(nextRenewalAction(contract({ noticeDays: 30 }), now)).toBe("Start the renewal plan");
    expect(nextRenewalAction(contract({ renewalStage: "discovery" }), now)).toMatch(/scope/);
    expect(nextRenewalAction(contract({ renewalStage: "proposal" }), now)).toMatch(/proposal/);
    expect(nextRenewalAction(contract({ renewalStage: "negotiation" }), now)).toMatch(/terms/);
    expect(nextRenewalAction(contract({ renewalStage: "committed" }), now)).toMatch(/order form/);
    expect(nextRenewalAction(contract({ renewalStage: "renewed" }), now)).toBe("No action");
  });

  it("treats renewed and lost as closed", () => {
    expect(isOpenRenewal(contract())).toBe(true);
    expect(isOpenRenewal(contract({ renewalStage: "lost" }))).toBe(false);
  });

  it("accepts only radar windows from the query string", () => {
    expect(parseRadarWindow("120")).toBe(120);
    expect(parseRadarWindow(["30"])).toBe(30);
    expect(parseRadarWindow("45")).toBeUndefined();
    expect(parseRadarWindow(undefined)).toBeUndefined();
  });
});
