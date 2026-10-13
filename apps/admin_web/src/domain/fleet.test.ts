import { deploymentMetadata, releaseRecord } from "@/test/builders";
import {
  compareVersions,
  deploymentRisks,
  filterFleet,
  isSupportedRelease,
  latestReleased,
  parseFleetFilters,
  releaseHeatmap,
  releaseImpact,
  upgradeReadiness,
} from "./fleet";
import type { Deployment, License, Release } from "./types";

const now = "2026-10-13T09:00:00Z";

function release(version: string, overrides: Partial<Release> = {}): Release {
  return {
    id: `rel_${version}`,
    productId: "prd_a",
    version,
    status: "released",
    releasedAt: "2026-01-01T00:00:00Z",
    endOfSupportAt: "2027-12-31T00:00:00Z",
    ociDigest: "",
    helmChartVersion: version,
    ...releaseRecord,
    ...overrides,
  };
}

function deployment(id: string, overrides: Partial<Deployment> = {}): Deployment {
  return {
    id,
    customerId: "cus_a",
    productId: "prd_a",
    logicalName: id,
    environment: "production",
    platform: "AWS",
    kubernetes: "EKS 1.31",
    region: "eu-west-2",
    releaseVersion: "2.4.0",
    licenseId: "LIC_1",
    supportState: "supported",
    lastCheckInAt: "2026-10-13T06:00:00Z",
    technicalOwnerId: "stf_04",
    ...deploymentMetadata,
    ...overrides,
  };
}

const license = (id: string, state: License["state"]) => ({ id, state }) as License;

const releases = [
  release("2.5.0", { status: "tested", releasedAt: undefined }),
  release("2.4.1", { minUpgradeFrom: "2.2.0" }),
  release("2.4.0"),
  release("2.3.1", { minUpgradeFrom: "2.1.0" }),
  release("2.2.4", { status: "deprecated", endOfSupportAt: "2026-11-30T00:00:00Z" }),
  release("2.1.0", { status: "end_of_support", endOfSupportAt: "2026-09-30T00:00:00Z" }),
];
const licenses = [
  license("LIC_1", "active"),
  license("LIC_G", "grace"),
  license("LIC_S", "suspended"),
];
const context = { releases, licenses, now };

describe("versions", () => {
  it("compares semantic versions numerically", () => {
    expect(compareVersions("2.10.0", "2.9.9")).toBe(1);
    expect(compareVersions("2.4", "2.4.0")).toBe(0);
    expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
  });

  it("picks the newest released version, never a tested build", () => {
    expect(latestReleased("prd_a", releases)?.version).toBe("2.4.1");
    expect(latestReleased("prd_none", releases)).toBeUndefined();
  });

  it("supports a release only when released, in window and every gate passed", () => {
    expect(isSupportedRelease(release("1.0.0"), now)).toBe(true);
    expect(isSupportedRelease(release("1.0.0", { status: "tested" }), now)).toBe(false);
    expect(
      isSupportedRelease(
        release("1.0.0", { gates: [{ name: "Approval", status: "pending" }] }),
        now,
      ),
    ).toBe(false);
    expect(
      isSupportedRelease(release("1.0.0", { endOfSupportAt: "2026-01-01T00:00:00Z" }), now),
    ).toBe(false);
  });
});

describe("deployment risks", () => {
  it("has no risk when supported, licensed and checking in", () => {
    expect(deploymentRisks(deployment("d"), context)).toEqual([]);
  });

  it("flags an end-of-support release and an overdue upgrade plan", () => {
    expect(deploymentRisks(deployment("d", { releaseVersion: "2.1.0" }), context)).toEqual([
      "unsupported_release",
      "upgrade_overdue",
    ]);
  });

  it("flags a support window ending soon unless an upgrade is planned", () => {
    const plan = { targetVersion: "2.4.1", plannedFor: "2026-11-08T02:00:00Z", recordedById: "s" };
    expect(deploymentRisks(deployment("d", { releaseVersion: "2.2.4" }), context)).toEqual([
      "support_window",
      "upgrade_overdue",
    ]);
    expect(
      deploymentRisks(deployment("d", { releaseVersion: "2.2.4", upgradePlan: plan }), context),
    ).toEqual(["support_window"]);
    expect(
      deploymentRisks(
        deployment("d", {
          releaseVersion: "2.2.4",
          upgradePlan: { ...plan, plannedFor: "2026-10-01T00:00:00Z" },
        }),
        context,
      ),
    ).toContain("upgrade_overdue");
  });

  it("flags license mismatch for a missing or invalid license", () => {
    expect(deploymentRisks(deployment("d", { licenseId: undefined }), context)).toContain(
      "license_mismatch",
    );
    expect(deploymentRisks(deployment("d", { licenseId: "LIC_S" }), context)).toContain(
      "license_mismatch",
    );
    expect(deploymentRisks(deployment("d", { licenseId: "LIC_G" }), context)).toEqual([]);
  });

  it("flags stale or missing check-ins", () => {
    expect(
      deploymentRisks(deployment("d", { lastCheckInAt: "2026-09-27T04:00:00Z" }), context),
    ).toEqual(["stale_check_in"]);
    expect(deploymentRisks(deployment("d", { lastCheckInAt: undefined }), context)).toEqual([
      "stale_check_in",
    ]);
  });
});

describe("upgrade readiness", () => {
  it("is up to date on the latest release", () => {
    expect(upgradeReadiness(deployment("d", { releaseVersion: "2.4.1" }), context)).toMatchObject({
      readiness: "current",
      reasons: [],
    });
  });

  it("is compatible when nothing stands in the way", () => {
    expect(upgradeReadiness(deployment("d"), context).readiness).toBe("compatible");
  });

  it("blocks a version below the direct upgrade floor and names the stepping stone", () => {
    const result = upgradeReadiness(deployment("d", { releaseVersion: "2.1.0" }), context);
    expect(result.readiness).toBe("blocked");
    expect(result.reasons[0]).toBe(
      "2.1.0 cannot upgrade directly to 2.4.1; upgrade to 2.3.1 first.",
    );
  });

  it("blocks an uncertified profile and reviews a conditional one", () => {
    const target = releases[1]!;
    const conditional = [
      ...releases.filter((r) => r !== target),
      {
        ...target,
        compatibility: {
          ...target.compatibility,
          openshift: { status: "conditional" as const, kubernetes: "4.16", note: "Needs SCC" },
          aks: { status: "unsupported" as const, kubernetes: "—" },
        },
      },
    ];
    expect(
      upgradeReadiness(deployment("d", { profile: "openshift" }), {
        ...context,
        releases: conditional,
      }),
    ).toMatchObject({ readiness: "review_needed", reasons: ["Needs SCC"] });
    expect(
      upgradeReadiness(deployment("d", { profile: "aks" }), { ...context, releases: conditional })
        .readiness,
    ).toBe("blocked");
  });

  it("weighs license, preflight, check-in and the last upgrade", () => {
    expect(upgradeReadiness(deployment("d", { licenseId: "LIC_S" }), context).readiness).toBe(
      "blocked",
    );
    expect(upgradeReadiness(deployment("d", { licenseId: undefined }), context).readiness).toBe(
      "blocked",
    );
    expect(upgradeReadiness(deployment("d", { preflight: "failed" }), context).readiness).toBe(
      "blocked",
    );
    const review = upgradeReadiness(
      deployment("d", {
        licenseId: "LIC_G",
        preflight: "warnings",
        lastCheckInAt: "2026-09-27T04:00:00Z",
        lastUpgrade: { at: now, fromVersion: "2.3.1", toVersion: "2.4.1", result: "rolled_back" },
      }),
      context,
    );
    expect(review.readiness).toBe("review_needed");
    expect(review.reasons).toEqual([
      "License LIC_G is in its grace period.",
      "The last preflight check had warnings.",
      "No check in for 16 days; confirm the running release.",
      "The last upgrade to 2.4.1 was rolled back.",
    ]);
    expect(
      upgradeReadiness(deployment("d", { preflight: "not_run", lastCheckInAt: undefined }), context)
        .reasons,
    ).toEqual([
      "No preflight result recorded.",
      "No check in recorded; confirm the running release.",
    ]);
    expect(
      upgradeReadiness(
        deployment("d", {
          lastUpgrade: { at: now, fromVersion: "2.3.1", toVersion: "2.4.0", result: "failed" },
        }),
        context,
      ).reasons,
    ).toEqual(["The last upgrade to 2.4.0 failed."]);
  });

  it("is blocked when the product has no released version", () => {
    expect(upgradeReadiness(deployment("d", { productId: "prd_none" }), context)).toMatchObject({
      readiness: "blocked",
      reasons: ["No released version to upgrade to."],
    });
  });
});

describe("fleet filters", () => {
  const known = {
    products: ["prd_a"],
    customers: ["cus_a", "cus_b"],
    regions: ["eu-west-2"],
    releases: ["2.4.0"],
  };

  it("parses known values and ignores the rest", () => {
    expect(
      parseFleetFilters(
        {
          environment: "production",
          platform: ["OpenShift", "AWS"],
          release: "9.9.9",
          support: "unsupported",
          license: "none",
          risk: "any",
          q: "halden",
        },
        known,
      ),
    ).toEqual({
      q: "halden",
      product: undefined,
      customer: undefined,
      environment: "production",
      platform: "OpenShift",
      region: undefined,
      release: undefined,
      support: "unsupported",
      license: "none",
      risk: "any",
    });
  });

  it("narrows the fleet by every filter", () => {
    const fleet = [
      deployment("dep_a"),
      deployment("dep_b", { customerId: "cus_b", environment: "staging", platform: "Azure" }),
      deployment("dep_c", { releaseVersion: "2.1.0", licenseId: undefined }),
    ];
    const ctx = { ...context, customerNames: { cus_a: "Alpha", cus_b: "Beta" } };
    const ids = (params: Record<string, string>) =>
      filterFleet(fleet, parseFleetFilters(params, known), ctx).map((d) => d.id);
    expect(ids({ environment: "staging" })).toEqual(["dep_b"]);
    expect(ids({ platform: "Azure" })).toEqual(["dep_b"]);
    expect(ids({ customer: "cus_b" })).toEqual(["dep_b"]);
    expect(ids({ product: "prd_a", region: "eu-west-2" })).toHaveLength(3);
    expect(ids({ release: "2.4.0" })).toEqual(["dep_a", "dep_b"]);
    expect(ids({ support: "supported" })).toHaveLength(3);
    expect(ids({ license: "none" })).toEqual(["dep_c"]);
    expect(ids({ license: "active" })).toEqual(["dep_a", "dep_b"]);
    expect(ids({ risk: "any" })).toEqual(["dep_c"]);
    expect(ids({ q: "beta" })).toEqual(["dep_b"]);
  });
});

describe("heatmap and impact", () => {
  const fleet = [
    deployment("a1", { customerId: "cus_a" }),
    deployment("a2", { customerId: "cus_a", environment: "staging" }),
    deployment("b1", { customerId: "cus_b", releaseVersion: "2.1.0" }),
    deployment("b2", { customerId: "cus_b", environment: "dr", releaseVersion: "2.1.0" }),
  ];

  it("counts deployments per released version and environment, newest first", () => {
    const rows = releaseHeatmap("prd_a", fleet, releases);
    expect(rows.map((r) => r.release.version)).toEqual([
      "2.4.1",
      "2.4.0",
      "2.3.1",
      "2.2.4",
      "2.1.0",
    ]);
    expect(rows[1]).toMatchObject({
      counts: { production: 1, staging: 1, dr: 0 },
      customers: 1,
      total: 2,
    });
  });

  it("lists the customers and deployments a release change affects", () => {
    expect(releaseImpact(releases[5]!, fleet)).toMatchObject({
      customerIds: ["cus_b"],
      production: 1,
    });
    expect(releaseImpact(releases[5]!, fleet).deployments).toHaveLength(2);
  });
});
