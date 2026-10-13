import type {
  Deployment,
  DeploymentEnvironment,
  DeploymentProfile,
  License,
  Release,
  ReleaseStatus,
  SupportState,
} from "./types";

const DAY_MS = 86_400_000;

/** Check-ins older than this are stale (spec §16 health metadata). */
export const STALE_CHECK_IN_DAYS = 7;
/** End of support within this window is a support-window risk. */
export const SUPPORT_WINDOW_DAYS = 90;

export const profileLabel: Record<DeploymentProfile, string> = {
  eks: "AWS EKS",
  aks: "Azure AKS",
  gke: "Google GKE",
  openshift: "Red Hat OpenShift",
  rke2: "RKE2 on premises",
};

export const deploymentProfiles = Object.keys(profileLabel) as DeploymentProfile[];

/** Semantic version comparison for x.y.z release versions. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

export function releaseFor(deployment: Deployment, releases: Release[]): Release | undefined {
  return releases.find(
    (r) => r.productId === deployment.productId && r.version === deployment.releaseVersion,
  );
}

/** Newest generally available release of a product: released, never merely built. */
export function latestReleased(productId: string, releases: Release[]): Release | undefined {
  return releases
    .filter((r) => r.productId === productId && r.status === "released")
    .sort((a, b) => compareVersions(b.version, a.version))[0];
}

export function daysSinceCheckIn(deployment: Deployment, now: string): number | undefined {
  if (!deployment.lastCheckInAt) return undefined;
  return Math.floor((Date.parse(now) - Date.parse(deployment.lastCheckInAt)) / DAY_MS);
}

// Risk ------------------------------------------------------------------------------------

export type DeploymentRisk =
  | "unsupported_release"
  | "support_window"
  | "license_mismatch"
  | "stale_check_in"
  | "upgrade_overdue";

export const deploymentRiskLabel: Record<DeploymentRisk, string> = {
  unsupported_release: "Unsupported release",
  support_window: "Support window ending",
  license_mismatch: "License mismatch",
  stale_check_in: "Stale check in",
  upgrade_overdue: "Upgrade plan overdue",
};

/**
 * Deployment risk card (spec §16.1): unsupported release, license mismatch, expiring
 * support window and overdue upgrade plan, plus stale check-in.
 */
export function deploymentRisks(
  deployment: Deployment,
  context: { releases: Release[]; licenses: License[]; now: string },
): DeploymentRisk[] {
  const { now } = context;
  const risks: DeploymentRisk[] = [];
  const release = releaseFor(deployment, context.releases);
  const eos = release?.endOfSupportAt ? Date.parse(release.endOfSupportAt) : undefined;
  const nowMs = Date.parse(now);

  const pastSupport =
    deployment.supportState === "unsupported" ||
    release?.status === "end_of_support" ||
    (eos !== undefined && eos <= nowMs);
  if (pastSupport) risks.push("unsupported_release");
  else if (eos !== undefined && eos - nowMs <= SUPPORT_WINDOW_DAYS * DAY_MS) {
    risks.push("support_window");
  }

  const license = context.licenses.find((l) => l.id === deployment.licenseId);
  if (
    deployment.supportState === "license_mismatch" ||
    !license ||
    !["active", "grace"].includes(license.state)
  ) {
    risks.push("license_mismatch");
  }

  const age = daysSinceCheckIn(deployment, now);
  if (
    deployment.supportState === "stale_check_in" ||
    age === undefined ||
    age > STALE_CHECK_IN_DAYS
  ) {
    risks.push("stale_check_in");
  }

  const needsUpgrade = pastSupport || risks.includes("support_window");
  const plan = deployment.upgradePlan;
  if (needsUpgrade && (!plan || Date.parse(plan.plannedFor) < nowMs)) {
    risks.push("upgrade_overdue");
  }
  return risks;
}

// Upgrade readiness -------------------------------------------------------------------------

export type Readiness = "current" | "compatible" | "review_needed" | "blocked";

export const readinessLabel: Record<Readiness, string> = {
  current: "Up to date",
  compatible: "Compatible",
  review_needed: "Review needed",
  blocked: "Blocked",
};

export interface ReadinessResult {
  readiness: Readiness;
  target?: Release;
  /** Why the deployment is not simply compatible; empty when it is. */
  reasons: string[];
}

/**
 * Upgrade readiness (spec §16.1) against the newest released version: compatible, review
 * needed or blocked, with reasons drawn only from approved metadata.
 */
export function upgradeReadiness(
  deployment: Deployment,
  context: { releases: Release[]; licenses: License[]; now: string },
): ReadinessResult {
  const target = latestReleased(deployment.productId, context.releases);
  if (!target) return { readiness: "blocked", reasons: ["No released version to upgrade to."] };
  if (compareVersions(deployment.releaseVersion, target.version) >= 0) {
    return { readiness: "current", target, reasons: [] };
  }

  const blocked: string[] = [];
  const review: string[] = [];

  if (compareVersions(deployment.releaseVersion, target.minUpgradeFrom) < 0) {
    const step = context.releases
      .filter(
        (r) =>
          r.productId === deployment.productId &&
          r.status === "released" &&
          compareVersions(r.version, target.minUpgradeFrom) >= 0 &&
          compareVersions(deployment.releaseVersion, r.minUpgradeFrom) >= 0,
      )
      .sort((a, b) => compareVersions(a.version, b.version))[0];
    blocked.push(
      `${deployment.releaseVersion} cannot upgrade directly to ${target.version}` +
        (step ? `; upgrade to ${step.version} first.` : "."),
    );
  }

  const compatibility = target.compatibility[deployment.profile];
  if (compatibility.status === "unsupported") {
    blocked.push(`${target.version} is not certified on ${profileLabel[deployment.profile]}.`);
  } else if (compatibility.status === "conditional") {
    review.push(
      compatibility.note ?? `Conditional support on ${profileLabel[deployment.profile]}.`,
    );
  }

  const license = context.licenses.find((l) => l.id === deployment.licenseId);
  if (!license) blocked.push("No license is bound to this deployment.");
  else if (["suspended", "revoked", "expired", "verification_failed"].includes(license.state)) {
    blocked.push(`License ${license.id} is not valid for an upgrade.`);
  } else if (license.state === "grace") {
    review.push(`License ${license.id} is in its grace period.`);
  }

  if (deployment.preflight === "failed") blocked.push("The last preflight check failed.");
  else if (deployment.preflight === "warnings")
    review.push("The last preflight check had warnings.");
  else if (deployment.preflight === "not_run") review.push("No preflight result recorded.");

  const age = daysSinceCheckIn(deployment, context.now);
  if (age === undefined || age > STALE_CHECK_IN_DAYS) {
    review.push(
      age === undefined
        ? "No check in recorded; confirm the running release."
        : `No check in for ${age} days; confirm the running release.`,
    );
  }

  if (deployment.lastUpgrade && deployment.lastUpgrade.result !== "succeeded") {
    review.push(
      `The last upgrade to ${deployment.lastUpgrade.toVersion} ${
        deployment.lastUpgrade.result === "rolled_back" ? "was rolled back" : "failed"
      }.`,
    );
  }

  if (blocked.length) return { readiness: "blocked", target, reasons: [...blocked, ...review] };
  if (review.length) return { readiness: "review_needed", target, reasons: review };
  return { readiness: "compatible", target, reasons: [] };
}

// Fleet filters -----------------------------------------------------------------------------

export interface FleetFilters {
  q: string;
  product?: string;
  customer?: string;
  environment?: DeploymentEnvironment;
  platform?: Deployment["platform"];
  region?: string;
  release?: string;
  support?: SupportState;
  license?: License["state"] | "none";
  risk?: "any";
}

const environments: DeploymentEnvironment[] = ["production", "staging", "dr"];
const platforms: Deployment["platform"][] = [
  "AWS",
  "Azure",
  "Google Cloud",
  "OpenShift",
  "On premises",
];
const supportStates: SupportState[] = [
  "supported",
  "review_needed",
  "unsupported",
  "stale_check_in",
  "license_mismatch",
  "unknown",
];
const licenseStates: Array<License["state"] | "none"> = [
  "active",
  "grace",
  "expired",
  "suspended",
  "revoked",
  "verification_failed",
  "none",
];

/** Reads fleet filters from the query string, ignoring unknown values (spec §16.1). */
export function parseFleetFilters(
  params: Record<string, string | string[] | undefined>,
  known: { products: string[]; customers: string[]; regions: string[]; releases: string[] },
): FleetFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const pick = <T extends string>(options: readonly T[], value: string | undefined) =>
    options.find((o) => o === value);
  return {
    q: first(params.q)?.slice(0, 100) ?? "",
    product: pick(known.products, first(params.product)),
    customer: pick(known.customers, first(params.customer)),
    environment: pick(environments, first(params.environment)),
    platform: pick(platforms, first(params.platform)),
    region: pick(known.regions, first(params.region)),
    release: pick(known.releases, first(params.release)),
    support: pick(supportStates, first(params.support)),
    license: pick(licenseStates, first(params.license)),
    risk: first(params.risk) === "any" ? "any" : undefined,
  };
}

export function filterFleet(
  deployments: Deployment[],
  filters: FleetFilters,
  context: {
    releases: Release[];
    licenses: License[];
    customerNames: Record<string, string>;
    now: string;
  },
): Deployment[] {
  const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
  return deployments.filter((d) => {
    if (filters.product && d.productId !== filters.product) return false;
    if (filters.customer && d.customerId !== filters.customer) return false;
    if (filters.environment && d.environment !== filters.environment) return false;
    if (filters.platform && d.platform !== filters.platform) return false;
    if (filters.region && d.region !== filters.region) return false;
    if (filters.release && d.releaseVersion !== filters.release) return false;
    if (filters.support && d.supportState !== filters.support) return false;
    if (filters.license) {
      const state = context.licenses.find((l) => l.id === d.licenseId)?.state ?? "none";
      if (state !== filters.license) return false;
    }
    if (filters.risk && deploymentRisks(d, context).length === 0) return false;
    if (terms.length) {
      const haystack = [
        d.id,
        d.logicalName,
        d.clusterId,
        d.region,
        context.customerNames[d.customerId],
      ]
        .join(" ")
        .toLowerCase();
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });
}

// Heatmap and impact ------------------------------------------------------------------------

export interface HeatmapRow {
  release: Release;
  counts: Record<DeploymentEnvironment, number>;
  customers: number;
  total: number;
}

/**
 * Release heatmap (spec §16.1): deployments by release and environment, newest first,
 * with support status carried by the release row.
 */
export function releaseHeatmap(
  productId: string,
  deployments: Deployment[],
  releases: Release[],
): HeatmapRow[] {
  return releases
    .filter((r) => r.productId === productId && r.releasedAt)
    .sort((a, b) => compareVersions(b.version, a.version))
    .map((release) => {
      const on = deployments.filter(
        (d) => d.productId === productId && d.releaseVersion === release.version,
      );
      const counts = { production: 0, staging: 0, dr: 0 };
      for (const d of on) counts[d.environment] += 1;
      return {
        release,
        counts,
        customers: new Set(on.map((d) => d.customerId)).size,
        total: on.length,
      };
    });
}

export interface ReleaseImpact {
  deployments: Deployment[];
  customerIds: string[];
  production: number;
}

/** Customers and deployments affected by a release, deprecation or end of support (§17). */
export function releaseImpact(release: Release, deployments: Deployment[]): ReleaseImpact {
  const affected = deployments.filter(
    (d) => d.productId === release.productId && d.releaseVersion === release.version,
  );
  return {
    deployments: affected,
    customerIds: [...new Set(affected.map((d) => d.customerId))],
    production: affected.filter((d) => d.environment === "production").length,
  };
}

/** Promotion states in order (spec §17). */
export const promotionStages: ReleaseStatus[] = [
  "draft",
  "tested",
  "approved",
  "released",
  "deprecated",
  "end_of_support",
];

/** Supported means released, inside its support window, and every gate passed (§17). */
export function isSupportedRelease(release: Release, now: string): boolean {
  if (release.status !== "released" && release.status !== "deprecated") return false;
  if (release.endOfSupportAt && Date.parse(release.endOfSupportAt) <= Date.parse(now)) return false;
  return release.gates.every((g) => g.status === "passed");
}
