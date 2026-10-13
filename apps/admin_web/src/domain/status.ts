import type {
  AccountStatus,
  ApprovalState,
  ApprovalType,
  ContractStatus,
  DeploymentEnvironment,
  HealthStatus,
  LicenseState,
  LifecycleStage,
  Priority,
  ProductStatus,
  ReleaseStatus,
  RenewalStage,
  RoleKey,
  SupportState,
} from "./types";

/** Semantic emphasis for a status; the UI maps each tone to the palette (spec §6). */
export type StatusTone = "neutral" | "info" | "healthy" | "risk" | "critical";

export interface StatusPresentation {
  label: string;
  tone: StatusTone;
}

export const healthStatus: Record<HealthStatus, StatusPresentation> = {
  healthy: { label: "Healthy", tone: "healthy" },
  watch: { label: "Watch", tone: "neutral" },
  at_risk: { label: "At risk", tone: "risk" },
  critical: { label: "Critical", tone: "critical" },
};

export const accountStatus: Record<AccountStatus, StatusPresentation> = {
  active: { label: "Active", tone: "healthy" },
  onboarding: { label: "Onboarding", tone: "info" },
  suspended: { label: "Suspended", tone: "risk" },
  churned: { label: "Churned", tone: "neutral" },
};

export const lifecycleStage: Record<LifecycleStage, string> = {
  commercial_handoff: "Commercial handoff",
  security_review: "Security review",
  architecture_discovery: "Architecture discovery",
  pilot_ready: "Pilot ready",
  deployment_ready: "Deployment ready",
  go_live: "Go live",
  stable: "Stable",
  renewal: "Renewal",
  offboarding: "Offboarding",
};

export const licenseState: Record<LicenseState, StatusPresentation> = {
  active: { label: "Active", tone: "healthy" },
  grace: { label: "Grace", tone: "risk" },
  expired: { label: "Expired", tone: "critical" },
  suspended: { label: "Suspended", tone: "risk" },
  revoked: { label: "Revoked", tone: "critical" },
  superseded: { label: "Superseded", tone: "neutral" },
  verification_failed: { label: "Verification failed", tone: "critical" },
};

export const supportState: Record<SupportState, StatusPresentation> = {
  supported: { label: "Supported", tone: "healthy" },
  review_needed: { label: "Review needed", tone: "neutral" },
  unsupported: { label: "Unsupported", tone: "critical" },
  stale_check_in: { label: "Stale check in", tone: "risk" },
  license_mismatch: { label: "License mismatch", tone: "risk" },
  unknown: { label: "Unknown health", tone: "neutral" },
};

export const releaseStatus: Record<ReleaseStatus, StatusPresentation> = {
  draft: { label: "Draft", tone: "neutral" },
  tested: { label: "Tested", tone: "neutral" },
  approved: { label: "Approved", tone: "info" },
  released: { label: "Released", tone: "healthy" },
  deprecated: { label: "Deprecated", tone: "risk" },
  end_of_support: { label: "End of support", tone: "critical" },
};

export const contractStatus: Record<ContractStatus, StatusPresentation> = {
  draft: { label: "Draft", tone: "neutral" },
  active: { label: "Active", tone: "healthy" },
  renewing: { label: "Renewing", tone: "info" },
  expired: { label: "Expired", tone: "critical" },
  terminated: { label: "Terminated", tone: "neutral" },
};

export const renewalStage: Record<RenewalStage, string> = {
  not_started: "Not started",
  discovery: "Discovery",
  proposal: "Proposal",
  negotiation: "Negotiation",
  committed: "Committed",
  renewed: "Renewed",
  lost: "Lost",
};

export const approvalState: Record<ApprovalState, StatusPresentation> = {
  pending: { label: "Pending", tone: "info" },
  approved: { label: "Approved", tone: "healthy" },
  rejected: { label: "Rejected", tone: "risk" },
  expired: { label: "Expired", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const approvalType: Record<ApprovalType, string> = {
  license_issue: "License issue",
  license_renew: "License renewal",
  license_revoke: "License revoke",
  license_suspend: "License suspension",
  entitlement_change: "Sensitive entitlement change",
  signing_key_rotation: "Signing key rotation",
  break_glass: "Break glass",
  security_policy_change: "Security policy change",
};

export const productStatus: Record<ProductStatus, StatusPresentation> = {
  active: { label: "Active", tone: "healthy" },
  pilot: { label: "Pilot", tone: "info" },
  planned: { label: "Planned", tone: "neutral" },
  retired: { label: "Retired", tone: "neutral" },
};

export const priority: Record<Priority, StatusPresentation> = {
  critical: { label: "Critical", tone: "critical" },
  high: { label: "High", tone: "risk" },
  medium: { label: "Medium", tone: "neutral" },
  low: { label: "Low", tone: "neutral" },
};

export const deploymentEnvironment: Record<DeploymentEnvironment, string> = {
  production: "Production",
  staging: "Staging",
  dr: "Disaster recovery",
};

export const roleName: Record<RoleKey, string> = {
  executive_viewer: "Executive Viewer",
  portfolio_admin: "Portfolio Administrator",
  customer_operations: "Customer Operations",
  customer_success: "Customer Success",
  commercial_operations: "Commercial Operations",
  finance_viewer: "Finance Viewer",
  license_operator: "License Operator",
  license_approver: "License Approver",
  release_manager: "Release Manager",
  support_engineer: "Support Engineer",
  security_admin: "Security Administrator",
  auditor: "Auditor",
  platform_admin: "Platform Administrator",
};
