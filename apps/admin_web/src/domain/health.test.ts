import {
  computeHealthFactors,
  healthScore,
  ILLUSTRATIVE_WEIGHTS,
  type HealthInput,
} from "./health";
import { buildTimeline } from "./timeline";
import type { Contact, Contract, Customer, Deployment, License, SupportCase } from "./types";
import { contractRecord, deploymentMetadata, releaseRecord } from "@/test/builders";

const NOW = "2026-10-13T09:00:00Z";

const customer: Customer = {
  id: "cus_a",
  displayName: "Alpha",
  legalName: "Alpha Ltd",
  status: "active",
  segment: "enterprise",
  industry: "Banking",
  headquartersCountry: "United Kingdom",
  region: "UK",
  website: "https://alpha.example",
  lifecycleStage: "stable",
  customerSince: "2025-01-01T00:00:00Z",
  health: "watch",
  supportTier: "premium",
  owners: { customer_success_owner: "stf_03" },
  productIds: ["prd_a"],
  deploymentModel: "customer_hosted",
  dataResidency: "UK",
  lastActivityAt: NOW,
  references: {},
};

const contact = (name: string, roles: Contact["roles"], active = true): Contact => ({
  id: name,
  customerId: "cus_a",
  name,
  title: "",
  email: "",
  roles,
  timezone: "Europe/London",
  preferredChannel: "email",
  active,
  verified: active,
});

const contract = (
  endsAt: string,
  renewalStage: Contract["renewalStage"] = "proposal",
): Contract => ({
  id: "ctr_a",
  number: "APC-1",
  customerId: "cus_a",
  productIds: ["prd_a"],
  status: "active",
  effectiveAt: "2025-11-01T00:00:00Z",
  endsAt,
  noticeDays: 30,
  renewalType: "manual",
  ...contractRecord,
  annualContractValue: { amountMinor: 1, currency: "GBP" },
  billingFrequency: "annual",
  renewalStage,
  renewalOwnerId: "stf_02",
});

const license = (state: License["state"], expiresAt = "2027-10-01T00:00:00Z"): License => ({
  id: "LIC_1",
  customerId: "cus_a",
  productId: "prd_a",
  contractId: "ctr_a",
  state,
  validFrom: "2025-11-01T00:00:00Z",
  expiresAt,
  graceDays: 30,
  deploymentAllowance: 2,
  deliveryState: "acknowledged",
  artifactFingerprint: "",
  revisions: [
    {
      revision: 1,
      issuedAt: "2025-11-01T00:00:00Z",
      issuedById: "stf_01",
      approvedById: "stf_05",
      signingKeyId: "k",
      payloadHash: "h",
      reason: "Initial issue",
      entitlements: [],
    },
  ],
});

const deployment = (overrides: Partial<Deployment> = {}): Deployment => ({
  ...deploymentMetadata,
  id: "dep_1",
  customerId: "cus_a",
  productId: "prd_a",
  logicalName: "alpha-prod",
  environment: "production",
  platform: "AWS",
  kubernetes: "EKS",
  region: "eu-west-2",
  releaseVersion: "2.0.0",
  supportState: "supported",
  lastCheckInAt: "2026-10-13T06:00:00Z",
  technicalOwnerId: "stf_04",
  ...overrides,
});

const supportCase = (overrides: Partial<SupportCase>): SupportCase => ({
  id: "sc",
  customerId: "cus_a",
  externalRef: "JSM-1",
  title: "",
  severity: "sev3",
  status: "open",
  openedAt: "2026-10-01T00:00:00Z",
  slaState: "within",
  ownerId: "stf_08",
  releaseVersion: "2.0.0",
  ...overrides,
});

function input(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    customer,
    contracts: [contract("2027-09-01T00:00:00Z")],
    licenses: [license("active")],
    deployments: [deployment()],
    releases: [
      {
        id: "r",
        productId: "prd_a",
        version: "2.0.0",
        status: "released",
        ociDigest: "",
        helmChartVersion: "",
        ...releaseRecord,
      },
    ],
    contacts: [
      contact("Exec", ["executive"]),
      contact("Sec", ["security"]),
      contact("Tech", ["technical"]),
    ],
    supportCases: [],
    now: NOW,
    ...overrides,
  };
}

const byKey = (factors: ReturnType<typeof computeHealthFactors>) =>
  Object.fromEntries(factors.map((f) => [f.key, f]));

describe("computeHealthFactors", () => {
  it("scores a healthy account at 100 with adoption not measured", () => {
    const factors = computeHealthFactors(input());
    expect(factors.filter((f) => f.status !== "ok").map((f) => f.key)).toEqual(["adoption"]);
    expect(healthScore(factors)).toBe(100);
  });

  it("raises commercial risk when the notice deadline is close and renewal is not committed", () => {
    const f = byKey(computeHealthFactors(input({ contracts: [contract("2026-11-10T00:00:00Z")] })));
    expect(f.commercial?.status).toBe("risk");
    expect(f.commercial?.signals[0]).toMatch(/notice deadline has passed|notice deadline in/);

    const committed = byKey(
      computeHealthFactors(input({ contracts: [contract("2026-11-10T00:00:00Z", "committed")] })),
    );
    expect(committed.commercial?.status).toBe("attention");
  });

  it("flags licenses in grace as risk and near expiry as attention", () => {
    expect(
      byKey(computeHealthFactors(input({ licenses: [license("grace")] }))).licensing?.status,
    ).toBe("risk");
    expect(
      byKey(computeHealthFactors(input({ licenses: [license("active", "2026-11-20T00:00:00Z")] })))
        .licensing?.status,
    ).toBe("attention");
  });

  it("flags unsupported releases and stale check-ins", () => {
    const eos = input({
      releases: [
        {
          id: "r",
          productId: "prd_a",
          version: "2.0.0",
          status: "end_of_support",
          ociDigest: "",
          helmChartVersion: "",
          ...releaseRecord,
        },
      ],
    });
    expect(byKey(computeHealthFactors(eos)).deployment?.status).toBe("risk");
    expect(
      byKey(
        computeHealthFactors(
          input({ deployments: [deployment({ supportState: "stale_check_in" })] }),
        ),
      ).deployment?.status,
    ).toBe("attention");
  });

  it("reads support severity and SLA", () => {
    expect(
      byKey(
        computeHealthFactors(
          input({ supportCases: [supportCase({ slaState: "breached", status: "resolved" })] }),
        ),
      ).support?.status,
    ).toBe("risk");
    expect(
      byKey(computeHealthFactors(input({ supportCases: [supportCase({ severity: "sev2" })] })))
        .support?.status,
    ).toBe("attention");
  });

  it("explains relationship gaps and deducts illustrative weights", () => {
    const factors = computeHealthFactors(
      input({ contacts: [contact("Tech", ["technical"]), contact("Old", ["security"], false)] }),
    );
    const relationship = byKey(factors).relationship;
    expect(relationship?.status).toBe("risk");
    expect(relationship?.signals).toEqual(
      expect.arrayContaining([
        "No active executive contact",
        "No active security contact",
        "Old is inactive",
      ]),
    );
    expect(healthScore(factors)).toBe(100 - ILLUSTRATIVE_WEIGHTS.risk);
  });
});

describe("buildTimeline", () => {
  it("merges sources newest first and drops future items", () => {
    const events = buildTimeline({
      customer,
      contracts: [contract("2027-09-01T00:00:00Z")],
      licenses: [license("active")],
      deployments: [deployment()],
      supportCases: [supportCase({ status: "resolved", resolvedAt: "2026-10-05T00:00:00Z" })],
      milestones: [
        {
          customerId: "cus_a",
          title: "Done",
          ownerId: "stf_03",
          dueAt: "2026-09-01T00:00:00Z",
          status: "done",
        },
        {
          customerId: "cus_a",
          title: "Later",
          ownerId: "stf_03",
          dueAt: "2026-12-01T00:00:00Z",
          status: "done",
        },
      ],
      audit: [],
      now: NOW,
    });
    expect(events.map((e) => e.category)).toEqual([
      "deployment",
      "support",
      "support",
      "success",
      "commercial",
      "licensing",
      "commercial",
    ]);
    expect(events.some((e) => e.title.includes("Later"))).toBe(false);
  });
});
