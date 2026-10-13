import type {
  AccessReviewCampaign,
  ApiClient,
  BreakGlassActivation,
  Iso,
  RoleKey,
  SecuritySignalWeek,
  SigningKey,
  StaffAccess,
  StaffUser,
} from "./types";

const DAY = 86_400_000;
const daysBetween = (from: Iso, to: Iso) => (Date.parse(to) - Date.parse(from)) / DAY;

/** Thresholds behind the security posture findings; policy configuration later (spec §43). */
export const securityPolicy = {
  /** An account with no sign in for this long is stale. */
  staleAccountDays: 30,
  /** A role not exercised for this long is unused and should be reviewed. */
  unusedRoleDays: 90,
  /** Failed admin sign ins in 30 days that warrant a look. */
  failedSignInThreshold: 5,
  /** An active API client unused for this long should be disabled. */
  apiClientIdleDays: 60,
  /** Credential or key rotation due within this window is flagged early. */
  rotationNoticeDays: 30,
  /** Weekly revoke requests above this multiple of the prior average are unusual. */
  revokeVolumeMultiple: 2,
};

// Roles -----------------------------------------------------------------------------------

export interface RoleDefinition {
  rights: string;
  restriction: string;
  /** Privileged roles can change licenses, keys, access or infrastructure. */
  privileged: boolean;
}

/** Role catalog from spec §5. */
export const roleDefinitions: Record<RoleKey, RoleDefinition> = {
  executive_viewer: {
    rights: "Read portfolio, customer, product, commercial and risk summaries.",
    restriction: "No mutations, no raw sensitive exports.",
    privileged: false,
  },
  portfolio_admin: {
    rights: "Manage products, customers, ownership metadata and global configuration.",
    restriction: "Cannot issue or revoke licenses without required approval.",
    privileged: true,
  },
  customer_operations: {
    rights: "Manage customer profile, contacts, lifecycle, deployment metadata and tasks.",
    restriction: "Cannot alter signing keys or finance records.",
    privileged: false,
  },
  customer_success: {
    rights: "Manage health, onboarding, success plans, QBR notes and renewal risks.",
    restriction: "No license signing or security administration.",
    privileged: false,
  },
  commercial_operations: {
    rights: "Manage contracts, subscriptions, renewal metadata and proposed entitlements.",
    restriction:
      "Cannot approve own entitlement or license request when policy requires a second person.",
    privileged: false,
  },
  finance_viewer: {
    rights: "Read contract value, invoice references, cost and margin reports.",
    restriction: "No license or security mutations.",
    privileged: false,
  },
  license_operator: {
    rights: "Prepare issue, renew, replace, suspend and revoke requests.",
    restriction: "No private key access, cannot self approve controlled actions.",
    privileged: true,
  },
  license_approver: {
    rights: "Approve governed licensing changes.",
    restriction: "Cannot approve own request where segregation of duties applies.",
    privileged: true,
  },
  release_manager: {
    rights: "Manage release metadata, compatibility, support windows and promotion state.",
    restriction: "Cannot change commercial terms or customer entitlement source.",
    privileged: false,
  },
  support_engineer: {
    rights: "Read support metadata, customer technical contacts and approved deployment metadata.",
    restriction: "No commercial changes, no standing customer production access.",
    privileged: false,
  },
  security_admin: {
    rights:
      "Manage internal roles, access reviews, API clients, key metadata and security settings.",
    restriction: "No silent signing or commercial override.",
    privileged: true,
  },
  auditor: {
    rights: "Read audit and evidence, run exports.",
    restriction: "Read only, no business mutations.",
    privileged: false,
  },
  platform_admin: {
    rights: "Operate the Apporine control plane infrastructure and runtime.",
    restriction: "Application data access limited to operational need and audited.",
    privileged: true,
  },
};

/** Actions that support four-eyes approval (spec §5.1). */
export const fourEyesActions = [
  "Production license revocation",
  "Signing key rotation",
  "Break glass activation",
  "Staff privilege elevation",
  "Security policy changes",
];

/** Role pairs one person should not hold together (segregation of duties, spec §5). */
export const conflictingRoles: { roles: [RoleKey, RoleKey]; reason: string }[] = [
  {
    roles: ["license_operator", "license_approver"],
    reason: "Could prepare and approve the same licensing change.",
  },
  {
    roles: ["security_admin", "license_approver"],
    reason: "The signing key custodian could approve the licenses those keys sign.",
  },
  {
    roles: ["security_admin", "auditor"],
    reason: "Could administer access and audit their own changes.",
  },
  {
    roles: ["commercial_operations", "license_approver"],
    reason: "Could propose an entitlement and approve the license that enforces it.",
  },
];

export function roleConflicts(roles: RoleKey[]) {
  return conflictingRoles.filter((c) => c.roles.every((r) => roles.includes(r)));
}

/** Roles a person holds now: standing roles plus unexpired, unremoved temporary grants. */
export function effectiveRoles(staff: StaffUser, access: StaffAccess | undefined, now: Iso) {
  const temporary = (access?.temporaryGrants ?? [])
    .filter((g) => !g.removedAt && Date.parse(g.expiresAt) > Date.parse(now))
    .map((g) => g.role);
  return [...new Set([...staff.roles, ...temporary])];
}

export function isPrivileged(roles: RoleKey[]) {
  return roles.some((r) => roleDefinitions[r].privileged);
}

/** Last sign in older than the stale threshold. */
export function isStaleAccount(staff: StaffUser, now: Iso) {
  return daysBetween(staff.lastSignInAt, now) > securityPolicy.staleAccountDays;
}

/** Standing roles never used, or not used within the unused-role window. */
export function unusedRoles(staff: StaffUser, access: StaffAccess | undefined, now: Iso) {
  return staff.roles.filter((role) => {
    const last = access?.roleLastUsedAt[role];
    return !last || daysBetween(last, now) > securityPolicy.unusedRoleDays;
  });
}

// Access reviews ----------------------------------------------------------------------------

export function reviewProgress(campaign: AccessReviewCampaign) {
  const decided = campaign.items.filter((i) => i.disposition !== "pending").length;
  return { decided, total: campaign.items.length, pending: campaign.items.length - decided };
}

export type ReviewStatus = "open" | "overdue" | "closed";

export function reviewStatus(campaign: AccessReviewCampaign, now: Iso): ReviewStatus {
  if (campaign.closedAt) return "closed";
  return Date.parse(campaign.dueAt) < Date.parse(now) ? "overdue" : "open";
}

// API clients and keys -----------------------------------------------------------------------

export type CredentialStatus = "current" | "due_soon" | "overdue" | "inactive";

export function credentialStatus(client: ApiClient, now: Iso): CredentialStatus {
  if (client.state !== "active") return "inactive";
  const days = daysBetween(now, client.rotationDueAt);
  if (days < 0) return "overdue";
  return days <= securityPolicy.rotationNoticeDays ? "due_soon" : "current";
}

export function credentialAgeDays(client: ApiClient, now: Iso) {
  return Math.floor(daysBetween(client.credentialCreatedAt, now));
}

export function isIdleClient(client: ApiClient, now: Iso) {
  if (client.state !== "active") return false;
  return (
    !client.lastUsedAt || daysBetween(client.lastUsedAt, now) > securityPolicy.apiClientIdleDays
  );
}

export function activeSigningKey(keys: SigningKey[]) {
  return keys.find((k) => k.status === "active");
}

export type RotationStatus = "scheduled" | "due" | "overdue" | "none";

/** Rotation state of the active signing key. */
export function rotationStatus(keys: SigningKey[], now: Iso): RotationStatus {
  const active = activeSigningKey(keys);
  if (!active?.nextRotationAt) return "none";
  const days = daysBetween(now, active.nextRotationAt);
  if (days < 0) return "overdue";
  return days <= securityPolicy.rotationNoticeDays ? "due" : "scheduled";
}

export function adoptionRatio(key: SigningKey) {
  return key.verifierAdoption.total ? key.verifierAdoption.trusted / key.verifierAdoption.total : 0;
}

// Break glass ---------------------------------------------------------------------------------

/** Break glass state as of now: an active activation past its expiry reads as expired. */
export function breakGlassState(activation: BreakGlassActivation, now: Iso) {
  if (activation.state === "active" && Date.parse(activation.expiresAt) <= Date.parse(now)) {
    return "expired";
  }
  return activation.state;
}

// Posture ---------------------------------------------------------------------------------------

export type FindingKind =
  | "access_review_overdue"
  | "segregation_conflict"
  | "expired_grant"
  | "mfa_gap"
  | "stale_account"
  | "unused_role"
  | "failed_auth"
  | "api_credential"
  | "idle_api_client"
  | "key_rotation"
  | "verifier_adoption"
  | "break_glass_active"
  | "revoke_volume";

export type FindingSeverity = "high" | "medium" | "low";

export interface SecurityFinding {
  id: string;
  kind: FindingKind;
  severity: FindingSeverity;
  title: string;
  detail: string;
  href: string;
}

export const findingCategory: Record<FindingKind, string> = {
  access_review_overdue: "Access review",
  segregation_conflict: "Privileged staff",
  expired_grant: "Privileged staff",
  mfa_gap: "Authentication",
  stale_account: "Stale access",
  unused_role: "Stale access",
  failed_auth: "Auth failures",
  api_credential: "API clients",
  idle_api_client: "API clients",
  key_rotation: "Key rotation",
  verifier_adoption: "Key rotation",
  break_glass_active: "Break glass",
  revoke_volume: "Security exceptions",
};

export interface PostureInput {
  now: Iso;
  staff: StaffUser[];
  access: StaffAccess[];
  reviews: AccessReviewCampaign[];
  clients: ApiClient[];
  keys: SigningKey[];
  breakGlass: BreakGlassActivation[];
  signals: SecuritySignalWeek[];
}

const severityRank: Record<FindingSeverity, number> = { high: 0, medium: 1, low: 2 };

/**
 * Security posture findings (spec §23): outstanding access reviews, privileged and stale
 * access, auth failures, old API credentials, key rotation risk, break glass and unusual
 * revoke volume. Most severe first.
 */
export function securityFindings(input: PostureInput): SecurityFinding[] {
  const { now } = input;
  const findings: SecurityFinding[] = [];
  const accessById = new Map(input.access.map((a) => [a.staffId, a]));

  for (const review of input.reviews) {
    if (reviewStatus(review, now) !== "overdue") continue;
    const { pending } = reviewProgress(review);
    findings.push({
      id: `review-${review.id}`,
      kind: "access_review_overdue",
      severity: "high",
      title: `${review.title} is overdue`,
      detail: `${pending} of ${review.items.length} decisions outstanding.`,
      href: `/security/access-reviews/${review.id}`,
    });
  }

  for (const person of input.staff) {
    const access = accessById.get(person.id);
    if (access?.status === "suspended") continue;
    const href = `/security/staff?person=${person.id}`;

    for (const conflict of roleConflicts(effectiveRoles(person, access, now))) {
      findings.push({
        id: `sod-${person.id}-${conflict.roles.join("-")}`,
        kind: "segregation_conflict",
        severity: "high",
        title: `${person.name} holds conflicting roles`,
        detail: conflict.reason,
        href,
      });
    }

    for (const grant of access?.temporaryGrants ?? []) {
      if (grant.removedAt || Date.parse(grant.expiresAt) > Date.parse(now)) continue;
      findings.push({
        id: `grant-${person.id}-${grant.role}`,
        kind: "expired_grant",
        severity: "high",
        title: `Expired temporary grant still assigned to ${person.name}`,
        detail: `${grant.role.replaceAll("_", " ")} expired and was not removed.`,
        href,
      });
    }

    if (!person.mfaEnabled || access?.authMethod === "Password only") {
      findings.push({
        id: `mfa-${person.id}`,
        kind: "mfa_gap",
        severity: isPrivileged(person.roles) ? "high" : "medium",
        title: `${person.name} signs in without MFA`,
        detail: "Staff access requires multi-factor authentication.",
        href,
      });
    }

    if (isStaleAccount(person, now)) {
      findings.push({
        id: `stale-${person.id}`,
        kind: "stale_account",
        severity: isPrivileged(person.roles) ? "high" : "medium",
        title: `${person.name} has not signed in for ${Math.floor(daysBetween(person.lastSignInAt, now))} days`,
        detail: "Dormant accounts should be suspended or confirmed in the next access review.",
        href,
      });
    } else {
      const unused = unusedRoles(person, access, now);
      if (unused.length) {
        findings.push({
          id: `unused-${person.id}`,
          kind: "unused_role",
          severity: "low",
          title: `${person.name} has ${unused.length === 1 ? "an unused role" : `${unused.length} unused roles`}`,
          detail: `Not used in ${securityPolicy.unusedRoleDays} days: ${unused.map((r) => r.replaceAll("_", " ")).join(", ")}.`,
          href,
        });
      }
    }

    if ((access?.failedSignIns30d ?? 0) >= securityPolicy.failedSignInThreshold) {
      findings.push({
        id: `auth-${person.id}`,
        kind: "failed_auth",
        severity: "medium",
        title: `${access!.failedSignIns30d} failed admin sign ins for ${person.name}`,
        detail: "In the last 30 days. Confirm with the staff member and the identity provider.",
        href,
      });
    }
  }

  for (const client of input.clients) {
    const status = credentialStatus(client, now);
    if (status === "overdue" || status === "due_soon") {
      findings.push({
        id: `cred-${client.id}`,
        kind: "api_credential",
        severity: status === "overdue" ? "high" : "low",
        title:
          status === "overdue"
            ? `${client.name} credential is past its rotation date`
            : `${client.name} credential rotation is due soon`,
        detail: `Credential is ${credentialAgeDays(client, now)} days old.`,
        href: "/security/api-clients",
      });
    }
    if (isIdleClient(client, now)) {
      findings.push({
        id: `idle-${client.id}`,
        kind: "idle_api_client",
        severity: "medium",
        title: `${client.name} is active but unused`,
        detail: `No calls in ${securityPolicy.apiClientIdleDays} days. Disable it if nothing depends on it.`,
        href: "/security/api-clients",
      });
    }
  }

  const rotation = rotationStatus(input.keys, now);
  const active = activeSigningKey(input.keys);
  if (active && (rotation === "due" || rotation === "overdue")) {
    findings.push({
      id: `rotation-${active.id}`,
      kind: "key_rotation",
      severity: rotation === "overdue" ? "high" : "medium",
      title:
        rotation === "overdue"
          ? `Signing key ${active.id} is past its rotation date`
          : `Signing key ${active.id} rotation is due`,
      detail: "Plan the rotation, overlap window and verifier adoption before cutover.",
      href: "/security/signing-keys",
    });
  }
  for (const key of input.keys.filter((k) => k.status === "planned")) {
    if (adoptionRatio(key) >= 1) continue;
    findings.push({
      id: `adoption-${key.id}`,
      kind: "verifier_adoption",
      severity: "medium",
      title: `Not every verifier trusts ${key.id} yet`,
      detail: `${key.verifierAdoption.trusted} of ${key.verifierAdoption.total} supported releases trust the next key.`,
      href: "/security/signing-keys",
    });
  }

  for (const activation of input.breakGlass) {
    if (breakGlassState(activation, now) !== "active") continue;
    const person = input.staff.find((s) => s.id === activation.staffId);
    findings.push({
      id: `bg-${activation.id}`,
      kind: "break_glass_active",
      severity: "high",
      title: `Break glass access active for ${person?.name ?? activation.staffId}`,
      detail: `${activation.scope}. ${activation.incidentRef}.`,
      href: "/security/break-glass",
    });
  }

  const latest = input.signals.at(-1);
  const prior = input.signals.slice(0, -1);
  if (latest && prior.length) {
    const baseline = prior.reduce((sum, w) => sum + w.revokeRequests, 0) / prior.length;
    if (latest.revokeRequests > baseline * securityPolicy.revokeVolumeMultiple) {
      findings.push({
        id: "revoke-volume",
        kind: "revoke_volume",
        severity: "medium",
        title: "Unusual license revoke volume",
        detail: `${latest.revokeRequests} revoke requests this week against a weekly average of ${baseline.toFixed(1)}.`,
        href: "/approvals?view=all",
      });
    }
  }

  return findings.sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity] || a.title.localeCompare(b.title),
  );
}

export type PostureState = "healthy" | "attention" | "overdue_review" | "key_rotation_due";

/** Overall posture with the spec §30 states, most urgent first. */
export function postureState(findings: SecurityFinding[]): PostureState {
  if (findings.some((f) => f.kind === "access_review_overdue")) return "overdue_review";
  if (findings.some((f) => f.kind === "key_rotation")) return "key_rotation_due";
  return findings.some((f) => f.severity !== "low") ? "attention" : "healthy";
}
