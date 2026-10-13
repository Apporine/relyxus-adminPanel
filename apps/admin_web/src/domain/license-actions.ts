import type { License, LicenseState, RoleKey, StaffUser } from "./types";

export type LicenseAction = "issue" | "renew" | "replace" | "rebind" | "suspend" | "revoke";

export interface LicenseActionPolicy {
  action: LicenseAction;
  /** Button label (spec §31). */
  label: string;
  /** Dialog or flow title (spec §31). */
  title: string;
  /** Required message (spec §31). */
  message: string;
  highImpact: boolean;
  /** Distinct approvers required; the requester never counts (segregation of duties). */
  approvals: number;
  stepUp: boolean;
  /** The operator types the license ID before the request is sent. */
  typedConfirmation: boolean;
  /** States from which the action can be requested. */
  allowedFrom: LicenseState[];
}

/**
 * Governance for license actions (spec §15, §21, §31). Every action is a request: the
 * License Issuer signs only after the required approvals. Copy for Replace and Rebind is
 * not in spec §31 and follows its pattern.
 */
export const licenseActionPolicy: Record<LicenseAction, LicenseActionPolicy> = {
  issue: {
    action: "issue",
    label: "Issue license",
    title: "Issue commercial license",
    message:
      "This creates a new signed license revision. It does not rebuild or modify the product application image.",
    highImpact: false,
    approvals: 1,
    stepUp: false,
    typedConfirmation: false,
    allowedFrom: [],
  },
  renew: {
    action: "renew",
    label: "Renew license",
    title: "Renew commercial license",
    message:
      "Review validity, entitlements and deployment allowance before creating the new signed revision.",
    highImpact: false,
    approvals: 1,
    stepUp: false,
    typedConfirmation: false,
    allowedFrom: ["active", "grace", "expired"],
  },
  replace: {
    action: "replace",
    label: "Replace license",
    title: "Replace license",
    message:
      "Replacement issues a new revision with the same rights and supersedes the current artifact. Deployments must import the new artifact.",
    highImpact: false,
    approvals: 1,
    stepUp: false,
    typedConfirmation: false,
    allowedFrom: ["active", "grace", "verification_failed"],
  },
  rebind: {
    action: "rebind",
    label: "Rebind deployment",
    title: "Rebind deployment",
    message:
      "Move the license binding from one registered deployment to another within the deployment allowance.",
    highImpact: false,
    approvals: 1,
    stepUp: false,
    typedConfirmation: false,
    allowedFrom: ["active", "grace", "verification_failed"],
  },
  suspend: {
    action: "suspend",
    label: "Suspend license",
    title: "Suspend license",
    message:
      "Suspension changes the commercial state according to policy. Enter the reason and review affected deployments before continuing.",
    highImpact: true,
    approvals: 1,
    stepUp: true,
    typedConfirmation: false,
    allowedFrom: ["active", "grace", "verification_failed"],
  },
  revoke: {
    action: "revoke",
    label: "Revoke license",
    title: "Revoke license",
    message:
      "This is a high impact action. Review the contractual reason, affected deployments and customer communication before requesting revocation.",
    highImpact: true,
    approvals: 2,
    stepUp: true,
    typedConfirmation: true,
    allowedFrom: ["active", "grace", "suspended", "verification_failed", "expired"],
  },
};

export const licenseActions = Object.keys(licenseActionPolicy) as LicenseAction[];

const preparers: RoleKey[] = ["license_operator"];

export type ActionAvailability = { allowed: true } | { allowed: false; reason: string };

/** Whether `staff` may prepare `action` on `license` right now, with the reason if not. */
export function actionAvailability(
  action: LicenseAction,
  staff: Pick<StaffUser, "roles">,
  license?: Pick<License, "state">,
  pendingRequest?: { id: string },
): ActionAvailability {
  if (!staff.roles.some((r) => preparers.includes(r))) {
    return { allowed: false, reason: "Requires the License Operator role." };
  }
  if (
    action !== "issue" &&
    license &&
    !licenseActionPolicy[action].allowedFrom.includes(license.state)
  ) {
    return {
      allowed: false,
      reason: `Not available while the license is ${license.state.replaceAll("_", " ")}.`,
    };
  }
  if (pendingRequest) {
    return {
      allowed: false,
      reason: `Request ${pendingRequest.id} is already awaiting a decision.`,
    };
  }
  return { allowed: true };
}

/** Approvers who could decide a request raised by `requesterId`. */
export function eligibleApprovers(staff: StaffUser[], requesterId: string): StaffUser[] {
  return staff.filter((s) => s.id !== requesterId && s.roles.includes("license_approver"));
}

/** Renewal extends from the current expiry by whole calendar months (UTC). */
export function renewedExpiry(expiresAt: string, months: number): string {
  const date = new Date(expiresAt);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString();
}
