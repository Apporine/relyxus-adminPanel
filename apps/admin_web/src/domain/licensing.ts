import { daysUntil } from "@/lib/format";
import type {
  ApprovalRequest,
  ChangeLine,
  Deployment,
  License,
  LicenseRevision,
  LicenseState,
} from "./types";

const DAY_MS = 86_400_000;
export const EXPIRING_WITHIN_DAYS = 60;

export function graceEndsAt(license: Pick<License, "expiresAt" | "graceDays">): string {
  return new Date(Date.parse(license.expiresAt) + license.graceDays * DAY_MS).toISOString();
}

export type LicenseRiskReason =
  "expiring" | "grace" | "suspended" | "verification_failed" | "drift" | "expired" | "revoked";

/** Why a license needs attention, most urgent first; empty when it does not. */
export function licenseRiskReasons(
  license: License,
  deployments: Deployment[],
  now: string,
): LicenseRiskReason[] {
  const reasons: LicenseRiskReason[] = [];
  if (license.state === "revoked") reasons.push("revoked");
  if (license.state === "expired") reasons.push("expired");
  if (license.state === "verification_failed") reasons.push("verification_failed");
  if (license.state === "suspended") reasons.push("suspended");
  if (license.state === "grace") reasons.push("grace");
  if (license.state === "active" && daysUntil(license.expiresAt, now) <= EXPIRING_WITHIN_DAYS)
    reasons.push("expiring");
  if (deployments.some((d) => d.licenseId === license.id && d.supportState === "license_mismatch"))
    reasons.push("drift");
  return reasons;
}

export const riskReasonLabel: Record<LicenseRiskReason, string> = {
  expiring: `Expires within ${EXPIRING_WITHIN_DAYS} days`,
  grace: "In grace period",
  suspended: "Suspended",
  verification_failed: "Verification failed",
  drift: "Entitlement drift",
  expired: "Expired",
  revoked: "Revoked",
};

// Bindings --------------------------------------------------------------------------------

export interface DeploymentBinding {
  deployment: Deployment;
  match: "match" | "mismatch" | "unknown";
  countsTowardAllowance: boolean;
}

/** Deployments bound to a license and whether their observed license metadata matches. */
export function deploymentBindings(
  license: License,
  deployments: Deployment[],
): DeploymentBinding[] {
  return deployments
    .filter((d) => d.licenseId === license.id)
    .map((deployment) => ({
      deployment,
      match:
        deployment.supportState === "license_mismatch"
          ? "mismatch"
          : deployment.supportState === "stale_check_in" || deployment.supportState === "unknown"
            ? "unknown"
            : "match",
      countsTowardAllowance: deployment.environment !== "staging",
    }));
}

export function allowanceUsage(license: License, deployments: Deployment[]) {
  const used = deploymentBindings(license, deployments).filter(
    (b) => b.countsTowardAllowance,
  ).length;
  return {
    used,
    allowed: license.deploymentAllowance,
    exceeded: used > license.deploymentAllowance,
  };
}

// Revisions ---------------------------------------------------------------------------------

/** Field-level differences between two revisions' entitlements, in the later revision's order. */
export function diffRevisions(
  before: Pick<LicenseRevision, "entitlements"> | undefined,
  after: Pick<LicenseRevision, "entitlements">,
): ChangeLine[] {
  const previous = new Map(before?.entitlements.map((e) => [e.key, e]) ?? []);
  const lines: ChangeLine[] = after.entitlements
    .filter((e) => previous.get(e.key)?.value !== e.value)
    .map((e) => ({ field: e.label, before: previous.get(e.key)?.value ?? "—", after: e.value }));
  for (const [key, entry] of previous) {
    if (!after.entitlements.some((e) => e.key === key))
      lines.push({ field: entry.label, before: entry.value, after: "—" });
  }
  return lines;
}

export function selectRevision(
  license: License,
  requested: string | string[] | undefined,
): LicenseRevision {
  const value = Number(Array.isArray(requested) ? requested[0] : requested);
  return (
    license.revisions.find((r) => r.revision === value) ??
    (license.revisions.at(-1) as LicenseRevision)
  );
}

export function pendingRequestsFor(
  license: License,
  approvals: ApprovalRequest[],
): ApprovalRequest[] {
  return approvals.filter(
    (a) => a.state === "pending" && a.targetType === "license" && a.targetId === license.id,
  );
}

// List ----------------------------------------------------------------------------------------

export interface LicenseFilters {
  q: string;
  state?: LicenseState;
  product?: string;
  /** "any" lists every license with a risk reason. */
  risk?: "any";
  expiring?: 30 | 60 | 90;
}

const states: LicenseState[] = [
  "active",
  "grace",
  "expired",
  "suspended",
  "revoked",
  "superseded",
  "verification_failed",
];

export function parseLicenseFilters(
  params: Record<string, string | string[] | undefined>,
  productIds: string[],
): LicenseFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const expiring = Number(first(params.expiring));
  return {
    q: first(params.q)?.slice(0, 100) ?? "",
    state: states.find((s) => s === first(params.state)),
    product: productIds.find((p) => p === first(params.product)),
    risk: first(params.risk) === "any" ? "any" : undefined,
    expiring: ([30, 60, 90] as const).find((d) => d === expiring),
  };
}

export function filterLicenses(
  licenses: License[],
  filters: LicenseFilters,
  context: { deployments: Deployment[]; customerNames: Record<string, string>; now: string },
): License[] {
  const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
  return licenses.filter((l) => {
    if (filters.state && l.state !== filters.state) return false;
    if (filters.product && l.productId !== filters.product) return false;
    if (filters.risk && licenseRiskReasons(l, context.deployments, context.now).length === 0)
      return false;
    if (filters.expiring) {
      const days = daysUntil(l.expiresAt, context.now);
      if (days < 0 || days > filters.expiring) return false;
    }
    if (terms.length) {
      const haystack =
        `${l.id} ${context.customerNames[l.customerId] ?? ""} ${l.customerId} ${l.revisions.at(-1)?.signingKeyId ?? ""}`.toLowerCase();
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });
}
