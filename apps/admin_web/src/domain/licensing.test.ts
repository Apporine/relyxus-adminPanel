import {
  canonicalJson,
  canonicalPayload,
  hashPayload,
  inspectArtifact,
  type LicenseArtifact,
} from "./artifact";
import {
  allowanceUsage,
  deploymentBindings,
  diffRevisions,
  filterLicenses,
  graceEndsAt,
  licenseRiskReasons,
  parseLicenseFilters,
  pendingRequestsFor,
  selectRevision,
} from "./licensing";
import type { ApprovalRequest, Deployment, License, LicenseRevision } from "./types";

const NOW = "2026-10-13T09:00:00Z";

const revision = (
  n: number,
  entitlements: Array<[string, string, string]>,
  payloadHash = "",
): LicenseRevision => ({
  revision: n,
  issuedAt: "2026-01-01T00:00:00Z",
  issuedById: "stf_01",
  approvedById: "stf_05",
  signingKeyId: "kms-sig-2026a",
  payloadHash,
  reason: "",
  entitlements: entitlements.map(([key, label, value]) => ({ key, label, value })),
});

function license(overrides: Partial<License> = {}): License {
  return {
    id: "LIC_1",
    customerId: "cus_a",
    productId: "prd_a",
    contractId: "ctr_a",
    state: "active",
    validFrom: "2025-11-01T00:00:00Z",
    expiresAt: "2027-10-31T00:00:00Z",
    graceDays: 30,
    deploymentAllowance: 2,
    deliveryState: "acknowledged",
    artifactFingerprint: "",
    revisions: [
      revision(1, [
        ["deployments.production.max", "Production deployments", "1"],
        ["support.tier", "Support tier", "standard"],
      ]),
      revision(2, [
        ["deployments.production.max", "Production deployments", "2"],
        ["modules.ai", "AI routing", "Enabled"],
      ]),
    ],
    ...overrides,
  };
}

const deployment = (id: string, overrides: Partial<Deployment> = {}): Deployment => ({
  id,
  customerId: "cus_a",
  productId: "prd_a",
  logicalName: id,
  environment: "production",
  platform: "AWS",
  kubernetes: "EKS",
  region: "eu-west-2",
  releaseVersion: "2.4.1",
  licenseId: "LIC_1",
  supportState: "supported",
  technicalOwnerId: "stf_04",
  ...overrides,
});

describe("license rules", () => {
  it("computes the end of the grace period", () => {
    expect(graceEndsAt({ expiresAt: "2026-10-05T23:59:59Z", graceDays: 30 })).toBe(
      "2026-11-04T23:59:59.000Z",
    );
  });

  it("explains why a license needs attention", () => {
    expect(licenseRiskReasons(license(), [], NOW)).toEqual([]);
    expect(licenseRiskReasons(license({ expiresAt: "2026-11-20T00:00:00Z" }), [], NOW)).toEqual([
      "expiring",
    ]);
    expect(
      licenseRiskReasons(
        license({ state: "grace" }),
        [deployment("d", { supportState: "license_mismatch" })],
        NOW,
      ),
    ).toEqual(["grace", "drift"]);
  });

  it("binds deployments and counts production and DR against the allowance", () => {
    const deployments = [
      deployment("prod"),
      deployment("dr", { environment: "dr", supportState: "stale_check_in" }),
      deployment("stage", { environment: "staging", supportState: "license_mismatch" }),
      deployment("other", { licenseId: "LIC_2" }),
    ];
    expect(
      deploymentBindings(license(), deployments).map((b) => [b.deployment.id, b.match]),
    ).toEqual([
      ["prod", "match"],
      ["dr", "unknown"],
      ["stage", "mismatch"],
    ]);
    expect(allowanceUsage(license(), deployments)).toEqual({
      used: 2,
      allowed: 2,
      exceeded: false,
    });
    expect(allowanceUsage(license({ deploymentAllowance: 1 }), deployments).exceeded).toBe(true);
  });

  it("diffs revisions including removed entitlements", () => {
    const [r1, r2] = license().revisions;
    expect(diffRevisions(r1, r2!)).toEqual([
      { field: "Production deployments", before: "1", after: "2" },
      { field: "AI routing", before: "—", after: "Enabled" },
      { field: "Support tier", before: "standard", after: "—" },
    ]);
    expect(diffRevisions(undefined, r1!)).toHaveLength(2);
  });

  it("selects a requested revision or falls back to the latest", () => {
    expect(selectRevision(license(), "1").revision).toBe(1);
    expect(selectRevision(license(), ["9"]).revision).toBe(2);
    expect(selectRevision(license(), undefined).revision).toBe(2);
  });

  it("finds pending requests that target the license", () => {
    const approvals = [
      { id: "a", state: "pending", targetType: "license", targetId: "LIC_1" },
      { id: "b", state: "approved", targetType: "license", targetId: "LIC_1" },
      { id: "c", state: "pending", targetType: "license", targetId: "LIC_2" },
    ] as ApprovalRequest[];
    expect(pendingRequestsFor(license(), approvals).map((a) => a.id)).toEqual(["a"]);
  });
});

describe("license list", () => {
  const licenses = [
    license(),
    license({ id: "LIC_2", customerId: "cus_b", state: "grace", productId: "prd_b" }),
    license({ id: "LIC_3", customerId: "cus_c", expiresAt: "2026-11-01T00:00:00Z" }),
  ];
  const context = {
    deployments: [],
    customerNames: { cus_a: "Alpha", cus_b: "Beta Bank", cus_c: "Gamma" },
    now: NOW,
  };
  const ids = (filters: Parameters<typeof filterLicenses>[1]) =>
    filterLicenses(licenses, filters, context).map((l) => l.id);

  it("parses filters and ignores unknown values", () => {
    expect(
      parseLicenseFilters({ state: "grace", risk: "any", expiring: "30", product: "nope" }, [
        "prd_a",
      ]),
    ).toEqual({
      q: "",
      state: "grace",
      product: undefined,
      risk: "any",
      expiring: 30,
    });
  });

  it("filters by state, product, risk, expiry window and search", () => {
    expect(ids({ q: "", state: "grace" })).toEqual(["LIC_2"]);
    expect(ids({ q: "", product: "prd_b" })).toEqual(["LIC_2"]);
    expect(ids({ q: "", risk: "any" })).toEqual(["LIC_2", "LIC_3"]);
    expect(ids({ q: "", expiring: 30 })).toEqual(["LIC_3"]);
    expect(ids({ q: "beta" })).toEqual(["LIC_2"]);
    expect(ids({ q: "lic_1" })).toEqual(["LIC_1"]);
  });
});

describe("artifact inspection", () => {
  async function artifactFor(l: License): Promise<LicenseArtifact> {
    const latest = l.revisions.at(-1)!;
    const payload = canonicalPayload(l, latest);
    return {
      payload,
      payloadHash: await hashPayload(payload),
      signingKeyId: latest.signingKeyId,
      signature: null,
    };
  }

  async function recordedLicense() {
    const l = license();
    for (const r of l.revisions) r.payloadHash = await hashPayload(canonicalPayload(l, r));
    return l;
  }

  it("canonical JSON sorts keys at every level", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: "x" } })).toBe(
      '{"a":{"c":"x","d":[2,{"y":2,"z":1}]},"b":1}',
    );
  });

  it("accepts an untampered artifact and defers the signature to the License Issuer", async () => {
    const l = await recordedLicense();
    const result = await inspectArtifact(JSON.stringify(await artifactFor(l), null, 2), [l]);
    expect(result.verdict).toBe("valid");
    expect(result.checks.map((c) => c.status)).toEqual([
      "pass",
      "pass",
      "pass",
      "pass",
      "pass",
      "pass",
      "not_checked",
    ]);
  });

  it("detects a payload edited after hashing", async () => {
    const l = await recordedLicense();
    const artifact = await artifactFor(l);
    artifact.payload.entitlements["deployments.production.max"] = "20";
    const result = await inspectArtifact(JSON.stringify(artifact), [l]);
    expect(result.verdict).toBe("invalid");
    expect(result.checks.find((c) => c.id === "integrity")?.status).toBe("fail");
    expect(result.checks.find((c) => c.id === "record")?.status).toBe("pass");
  });

  it("rejects unreadable, malformed and unknown artifacts", async () => {
    const l = await recordedLicense();
    expect((await inspectArtifact("{nope", [l])).checks.map((c) => c.status)).toEqual([
      "fail",
      "not_checked",
      "not_checked",
      "not_checked",
      "not_checked",
      "not_checked",
      "not_checked",
    ]);
    expect((await inspectArtifact('{"payload":{}}', [l])).checks[1]?.status).toBe("fail");
    const unknown = await artifactFor(license({ id: "LIC_X" }));
    expect(
      (await inspectArtifact(JSON.stringify(unknown), [l])).checks.find((c) => c.id === "known")
        ?.status,
    ).toBe("fail");
  });

  it("flags superseded revisions and unusable states", async () => {
    const l = await recordedLicense();
    const first = l.revisions[0]!;
    const payload = canonicalPayload(l, first);
    const old: LicenseArtifact = {
      payload,
      payloadHash: await hashPayload(payload),
      signingKeyId: first.signingKeyId,
      signature: null,
    };
    expect(
      (await inspectArtifact(JSON.stringify(old), [l])).checks.find((c) => c.id === "state")
        ?.detail,
    ).toBe("Superseded by revision 2.");
    const revoked = { ...l, state: "revoked" as const };
    const result = await inspectArtifact(JSON.stringify(await artifactFor(revoked)), [revoked]);
    expect(result.checks.find((c) => c.id === "state")?.status).toBe("fail");
  });
});
