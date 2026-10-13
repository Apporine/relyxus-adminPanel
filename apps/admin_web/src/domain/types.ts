/**
 * Control plane domain types (spec §36). Identifiers are stable opaque strings, never
 * names. Timestamps are ISO 8601 UTC strings; money is integer minor units.
 */

export type Iso = string;

export type CurrencyCode = "GBP" | "USD" | "EUR";

export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

export type Environment = "PRODUCTION" | "STAGING" | "DEVELOPMENT";

// Staff and access ------------------------------------------------------------------

export type RoleKey =
  | "executive_viewer"
  | "portfolio_admin"
  | "customer_operations"
  | "customer_success"
  | "commercial_operations"
  | "finance_viewer"
  | "license_operator"
  | "license_approver"
  | "release_manager"
  | "support_engineer"
  | "security_admin"
  | "auditor"
  | "platform_admin";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  title: string;
  roles: RoleKey[];
  /** Product scope; empty means all products. */
  productScope: string[];
  mfaEnabled: boolean;
  lastSignInAt: Iso;
}

// Products ----------------------------------------------------------------------------

export type ProductStatus = "active" | "pilot" | "planned" | "retired";

export interface Product {
  id: string;
  code: string;
  name: string;
  status: ProductStatus;
  ownerId: string;
  supportModel: string;
  currentReleaseTrain: string;
}

// Customers ---------------------------------------------------------------------------

export type LifecycleStage =
  | "commercial_handoff"
  | "security_review"
  | "architecture_discovery"
  | "pilot_ready"
  | "deployment_ready"
  | "go_live"
  | "stable"
  | "renewal"
  | "offboarding";

export type HealthStatus = "healthy" | "watch" | "at_risk" | "critical";

export type AccountStatus = "active" | "onboarding" | "suspended" | "churned";

export type Segment = "enterprise" | "mid_market" | "public_sector";

export type Region = "UK" | "EU" | "North America" | "Middle East" | "APAC";

export type OwnerRole =
  | "executive_sponsor"
  | "commercial_owner"
  | "customer_success_owner"
  | "technical_owner"
  | "support_owner"
  | "security_owner";

export interface Customer {
  id: string;
  displayName: string;
  legalName: string;
  status: AccountStatus;
  parentId?: string;
  segment: Segment;
  industry: string;
  headquartersCountry: string;
  region: Region;
  website: string;
  lifecycleStage: LifecycleStage;
  customerSince: Iso;
  goLiveAt?: Iso;
  nextRenewalAt?: Iso;
  health: HealthStatus;
  /** Active annual contract value; absent when no approved commercial record exists. */
  annualContractValue?: Money;
  supportTier: "standard" | "premium" | "mission_critical";
  owners: Partial<Record<OwnerRole, string>>;
  productIds: string[];
  deploymentModel: "customer_hosted" | "apporine_managed";
  dataResidency: string;
  lastActivityAt: Iso;
  references: { crmId?: string; financeId?: string; supportId?: string };
}

export type ContactRole =
  "executive" | "commercial" | "technical" | "security" | "support" | "billing";

export interface Contact {
  id: string;
  customerId: string;
  name: string;
  title: string;
  email: string;
  roles: ContactRole[];
  timezone: string;
  preferredChannel: "email" | "phone" | "teams" | "slack";
  active: boolean;
  verified: boolean;
}

// Commercial --------------------------------------------------------------------------

export type ContractStatus = "draft" | "active" | "renewing" | "expired" | "terminated";

export type RenewalStage =
  "not_started" | "discovery" | "proposal" | "negotiation" | "committed" | "renewed" | "lost";

export interface Contract {
  id: string;
  number: string;
  customerId: string;
  productIds: string[];
  status: ContractStatus;
  effectiveAt: Iso;
  endsAt: Iso;
  noticeDays: number;
  renewalType: "auto" | "manual";
  annualContractValue: Money;
  billingFrequency: "annual" | "quarterly";
  purchaseOrderRef?: string;
  renewalStage: RenewalStage;
  renewalOwnerId: string;
  legalEntity: string;
  /** Contracted value per entitlement key; the commercial source of truth (spec §13). */
  scope: Record<string, string>;
  documents: ContractDocuments;
  renewalTarget?: Money;
  procurementContactId?: string;
  /** Link to the billing system only; no payment or card data is held (spec §13). */
  billing: { invoiceSystemId: string; paymentStatus: "current" | "overdue" | "not_integrated" };
}

/** Secure references to signed documents; the documents live in the document store. */
export interface ContractDocuments {
  masterAgreement: string;
  orderForm: string;
  dataProcessingAgreement?: string;
  securityAddendum?: string;
}

// Entitlements ------------------------------------------------------------------------

export type EntitlementDataType = "integer" | "enum" | "boolean";

/** Product scoped entitlement definition (spec §14). */
export interface EntitlementDefinition {
  id: string;
  productId: string;
  key: string;
  label: string;
  dataType: EntitlementDataType;
  /** Human-readable validation rule, such as "1 to 10". */
  validation: string;
  allowedValues?: string[];
  defaultValue: string;
  description: string;
  lifecycle: "draft" | "active" | "deprecated";
  /** How sensitive the value is when shared outside Apporine (spec §9). */
  securityClassification: "public" | "internal" | "confidential";
  /** Allowances may be under-used by deployments; other values must match exactly. */
  comparison: "allowance" | "exact";
}

export interface EntitlementChange {
  at: Iso;
  value: string;
  byId: string;
  reason: string;
  approvalId?: string;
}

/** Customer entitlement record derived from a contract (spec §14). */
export interface CustomerEntitlement {
  id: string;
  customerId: string;
  productId: string;
  key: string;
  value: string;
  sourceContractId: string;
  effectiveAt: Iso;
  expiresAt: Iso;
  overrideReason?: string;
  approvalId?: string;
  history: EntitlementChange[];
}

/** License metadata a deployment reported at check in; observed, never authoritative. */
export interface ObservedEntitlement {
  customerId: string;
  productId: string;
  key: string;
  value: string;
  observedAt: Iso;
  deploymentId: string;
}

// Licensing ---------------------------------------------------------------------------

export type LicenseState =
  "active" | "grace" | "expired" | "suspended" | "revoked" | "superseded" | "verification_failed";

export interface EntitlementValue {
  key: string;
  label: string;
  value: string;
}

export interface LicenseRevision {
  revision: number;
  issuedAt: Iso;
  issuedById: string;
  approvedById: string;
  signingKeyId: string;
  payloadHash: string;
  reason: string;
  entitlements: EntitlementValue[];
}

export interface License {
  id: string;
  customerId: string;
  productId: string;
  contractId: string;
  state: LicenseState;
  validFrom: Iso;
  expiresAt: Iso;
  graceDays: number;
  deploymentAllowance: number;
  deliveryState: "pending" | "delivered" | "acknowledged" | "offline_package";
  artifactFingerprint: string;
  lastVerificationAt?: Iso;
  revisions: LicenseRevision[];
}

// Deployments and releases ------------------------------------------------------------

export type DeploymentEnvironment = "production" | "staging" | "dr";

export type SupportState =
  "supported" | "review_needed" | "unsupported" | "stale_check_in" | "license_mismatch" | "unknown";

/** Kubernetes distribution profile a release is certified against (spec §17). */
export type DeploymentProfile = "eks" | "aks" | "gke" | "openshift" | "rke2";

export type PreflightResult = "passed" | "warnings" | "failed" | "not_run";

export interface UpgradeRecord {
  at: Iso;
  fromVersion: string;
  toVersion: string;
  result: "succeeded" | "failed" | "rolled_back";
}

export interface UpgradePlan {
  targetVersion: string;
  plannedFor: Iso;
  recordedById: string;
}

export interface Deployment {
  id: string;
  customerId: string;
  productId: string;
  logicalName: string;
  environment: DeploymentEnvironment;
  platform: "AWS" | "Azure" | "Google Cloud" | "OpenShift" | "On premises";
  kubernetes: string;
  region: string;
  releaseVersion: string;
  licenseId?: string;
  supportState: SupportState;
  lastCheckInAt?: Iso;
  technicalOwnerId: string;
  profile: DeploymentProfile;
  /** Customer-assigned logical cluster ID; never a hostname or credential. */
  clusterId: string;
  country: string;
  residency: string;
  installKitVersion: string;
  preflight: PreflightResult;
  lastUpgrade?: UpgradeRecord;
  /** Backup status is shared only when the customer permits it (spec §16). */
  backupStatus: "healthy" | "failing" | "not_shared";
  maintenanceWindow: string;
  upgradePlan?: UpgradePlan;
}

export type ReleaseStatus =
  "draft" | "tested" | "approved" | "released" | "deprecated" | "end_of_support";

export interface Release {
  id: string;
  productId: string;
  version: string;
  status: ReleaseStatus;
  releasedAt?: Iso;
  endOfSupportAt?: Iso;
  ociDigest: string;
  helmChartVersion: string;
  /** Oldest version that may upgrade directly to this release. */
  minUpgradeFrom: string;
  sbomRef?: string;
  signed: boolean;
  provenance: boolean;
  /** Conformance and acceptance gates; artifacts alone never make a release supported. */
  gates: AcceptanceGate[];
  compatibility: Record<DeploymentProfile, CompatibilityEntry>;
  dependencies: { name: string; versions: string }[];
  notes: string[];
}

export interface AcceptanceGate {
  name: string;
  status: "passed" | "failed" | "pending";
}

export interface CompatibilityEntry {
  status: "supported" | "conditional" | "unsupported";
  /** Kubernetes versions covered, such as "1.29 – 1.31". */
  kubernetes: string;
  note?: string;
}

// Governance --------------------------------------------------------------------------

export type ApprovalType =
  | "license_issue"
  | "license_renew"
  | "license_revoke"
  | "license_suspend"
  | "entitlement_change"
  | "signing_key_rotation"
  | "break_glass"
  | "security_policy_change";

export type ApprovalState = "pending" | "approved" | "rejected" | "expired" | "cancelled";

export interface ChangeLine {
  field: string;
  before: string;
  after: string;
}

/** A record the decider can check; external references have no link. */
export interface Evidence {
  label: string;
  reference: string;
  href?: string;
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  state: ApprovalState;
  highImpact: boolean;
  requesterId: string;
  /** Staff who must not decide this request (segregation of duties). */
  excludedApproverIds: string[];
  approverIds: string[];
  decidedById?: string;
  decidedAt?: Iso;
  decisionReason?: string;
  customerId?: string;
  productId?: string;
  targetType: "license" | "contract_line" | "entitlement" | "signing_key" | "staff" | "policy";
  targetId: string;
  title: string;
  reason: string;
  impact: string[];
  diff: ChangeLine[];
  policy: string[];
  evidence?: Evidence[];
  requiresStepUp: boolean;
  createdAt: Iso;
  expiresAt: Iso;
}

export type AuditResult = "success" | "failure" | "denied";

/** Who acted: a staff member, a Control API client, or the platform's own automation. */
export type AuditActorType = "staff" | "api_client" | "system";

export interface AuditEvent {
  id: string;
  at: Iso;
  actorId: string;
  /** Defaults to staff. API clients use their client ID; system actors use a job name. */
  actorType?: AuditActorType;
  /** Identity the action ran as when it differs from the actor, such as break glass. */
  effectiveIdentity?: string;
  /** Identity provider, method and step-up, such as "Entra ID · phishing-resistant MFA". */
  authContext?: string;
  action: string;
  actionLabel: string;
  objectType: string;
  objectId: string;
  customerId?: string;
  productId?: string;
  result: AuditResult;
  reason?: string;
  requestId: string;
  correlationId: string;
  source: "web" | "api" | "automation";
  highImpact: boolean;
  /** Network origin where appropriate; documentation ranges in fixtures. */
  sourceAddress?: string;
  environment?: DeploymentEnvironment;
  /** Before and after summary of the change. */
  changes?: ChangeLine[];
  /** Restricted fields: before and after values are masked without field permission. */
  sensitivity?: "commercial" | "security";
  approvalId?: string;
  evidence?: Evidence[];
  /** Append-only integrity: position in the log and the hash chain (spec §24). */
  sequence?: number;
  previousHash?: string;
  hash?: string;
}

/** Delivery of audit events to the external SIEM stream (spec §24). */
export interface AuditStreamStatus {
  destination: string;
  state: "healthy" | "delayed" | "disabled";
  lastDeliveredAt: Iso;
  /** Events written but not yet acknowledged by the destination. */
  backlog: number;
}

export type AuditExportStatus = "queued" | "running" | "ready" | "expired" | "denied";

/** Audit export or evidence bundle in the export center (spec §24). */
export interface AuditExport {
  id: string;
  kind: "audit_export" | "evidence_bundle";
  title: string;
  requestedById: string;
  requestedAt: Iso;
  /** Filter or scope the export covers, in words. */
  scope: string;
  format: "CSV" | "JSON Lines" | "ZIP";
  status: AuditExportStatus;
  rows?: number;
  /** Includes restricted fields; recorded as a sensitive export. */
  sensitive: boolean;
  approvalId?: string;
  /** SHA-256 of the export manifest, for integrity checks. */
  manifestDigest?: string;
  /** Immutable storage with retention lock for protected exports. */
  storage: string;
  completedAt?: Iso;
  expiresAt?: Iso;
}

// Work --------------------------------------------------------------------------------

export type TaskKind =
  | "license_expiry"
  | "renewal"
  | "failed_refresh"
  | "unsupported_deployment"
  | "missing_owner"
  | "overdue_onboarding"
  | "approval";

export type Priority = "critical" | "high" | "medium" | "low";

export interface Task {
  id: string;
  kind: TaskKind;
  title: string;
  priority: Priority;
  customerId?: string;
  ownerId: string;
  dueAt: Iso;
  href: string;
}

// Support and success ---------------------------------------------------------------

export type CaseSeverity = "sev1" | "sev2" | "sev3" | "sev4";

/** Support case reference; full case content stays in the support platform (spec §20). */
export interface SupportCase {
  id: string;
  customerId: string;
  externalRef: string;
  title: string;
  severity: CaseSeverity;
  status: "open" | "pending_customer" | "resolved";
  openedAt: Iso;
  resolvedAt?: Iso;
  slaState: "within" | "at_risk" | "breached";
  ownerId: string;
  releaseVersion: string;
  /** Support platform holding the full case; only the reference is kept here (spec §20). */
  sourceSystem?: "Jira Service Management" | "Zendesk" | "ServiceNow";
  productId?: string;
  firstResponseAt?: Iso;
  escalation?: Escalation;
}

/** Escalation workspace record (spec §20). */
export interface Escalation {
  level: 1 | 2 | 3;
  openedAt: Iso;
  businessContext: string;
  ownerIds: string[];
  /** How often the customer is updated, such as "Every 4 hours". */
  cadence: string;
  executiveVisible: boolean;
  nextUpdateAt: Iso;
  updates: { at: Iso; byId: string; note: string }[];
}

/** Success plan goal (spec §20). */
export interface SuccessGoal {
  id: string;
  customerId: string;
  title: string;
  outcome: string;
  measure: string;
  status: "on_track" | "at_risk" | "achieved";
  ownerId: string;
}

/** Quarterly business review record (spec §20). Sensitive notes are restricted. */
export interface QbrRecord {
  id: string;
  customerId: string;
  heldAt: Iso;
  attendees: { name: string; side: "apporine" | "customer" }[];
  summary: string;
  commitments: { text: string; ownerId: string; dueAt: Iso; status: "open" | "done" }[];
  nextActions: string[];
  sensitiveNotes?: string;
}

/** Risk register entry. */
export interface RiskEntry {
  id: string;
  customerId: string;
  title: string;
  category:
    | "commercial"
    | "licensing"
    | "deployment"
    | "support"
    | "adoption"
    | "relationship"
    | "security";
  severity: "low" | "medium" | "high";
  ownerId: string;
  mitigation: string;
  raisedAt: Iso;
  dueAt: Iso;
  status: "open" | "mitigating" | "accepted" | "closed";
}

/**
 * Operator override of a derived health factor (spec §19): reason, expiry and approver,
 * with the calculated value kept visible.
 */
export interface HealthOverride {
  customerId: string;
  factor: string;
  to: "ok" | "attention" | "risk";
  reason: string;
  byId: string;
  approverId?: string;
  expiresAt: Iso;
}

/** Onboarding checklist item (spec §11). */
export interface OnboardingItem {
  id: string;
  customerId: string;
  stage: LifecycleStage;
  title: string;
  ownerId: string;
  dueAt: Iso;
  status: "done" | "in_progress" | "not_started" | "blocked";
  dependsOn?: string;
  evidenceRef?: string;
}

export interface SuccessMilestone {
  goalId?: string;
  evidenceRef?: string;
  customerId: string;
  title: string;
  ownerId: string;
  dueAt: Iso;
  status: "done" | "in_progress" | "not_started" | "overdue";
}

// Economics ---------------------------------------------------------------------------

export interface CostSnapshot {
  month: string;
  productId: string;
  cloudCost: Money;
  supportHours: number;
}

export interface HealthSnapshot {
  month: string;
  healthy: number;
  watch: number;
  atRisk: number;
  critical: number;
}

// Security operations (spec §5, §23) -----------------------------------------------------

/** Time-limited role elevation; preferred to permanent broad access (spec §5.1). */
export interface TemporaryGrant {
  role: RoleKey;
  grantedAt: Iso;
  expiresAt: Iso;
  grantedById: string;
  approvalId?: string;
  reason: string;
  /** Set once the grant is removed; an expired grant without it is still assigned. */
  removedAt?: Iso;
}

/** Security view of a staff account: identity, sessions and role use (spec §23). */
export interface StaffAccess {
  staffId: string;
  identitySource: "Entra ID" | "Okta";
  authMethod: "Phishing-resistant MFA" | "Authenticator app" | "Password only";
  status: "active" | "suspended";
  activeSessions: number;
  failedSignIns30d: number;
  /** Last time each assigned role was exercised; a missing role was never used. */
  roleLastUsedAt: Partial<Record<RoleKey, Iso>>;
  temporaryGrants: TemporaryGrant[];
}

export type ReviewDisposition = "pending" | "keep" | "reduce" | "remove";

export interface AccessReviewItem {
  staffId: string;
  role: RoleKey;
  disposition: ReviewDisposition;
  decidedById?: string;
  note?: string;
}

/** Access review campaign; decisions change nothing until applied (spec §23, §31). */
export interface AccessReviewCampaign {
  id: string;
  title: string;
  scope: string;
  reviewerId: string;
  startedAt: Iso;
  dueAt: Iso;
  closedAt?: Iso;
  items: AccessReviewItem[];
}

/** Machine client of the Control API. Secrets are never shown, only metadata. */
export interface ApiClient {
  id: string;
  name: string;
  ownerId: string;
  purpose: string;
  scopes: string[];
  environment: Environment;
  state: "active" | "disabled" | "revoked";
  createdAt: Iso;
  lastUsedAt?: Iso;
  credentialCreatedAt: Iso;
  rotationDueAt: Iso;
}

/** License signing key metadata. Private key material is never displayed (spec §23). */
export interface SigningKey {
  id: string;
  algorithm: "Ed25519" | "ECDSA P-256";
  status: "planned" | "active" | "verify_only" | "retired";
  createdAt: Iso;
  activatedAt?: Iso;
  /** End of the window in which verifiers trust both the old and the new key. */
  overlapEndsAt?: Iso;
  retiredAt?: Iso;
  nextRotationAt?: Iso;
  publicKeyFingerprint: string;
  /** Supported releases whose verifier trusts this key, out of all supported releases. */
  verifierAdoption: { trusted: number; total: number };
  custodianId: string;
}

export type BreakGlassState = "requested" | "active" | "expired" | "ended" | "rejected";

/** Emergency access record: time limited, audited, approved by policy (spec §23). */
export interface BreakGlassActivation {
  id: string;
  staffId: string;
  incidentRef: string;
  reason: string;
  scope: string;
  state: BreakGlassState;
  requestedAt: Iso;
  approverId?: string;
  approvalId?: string;
  activatedAt?: Iso;
  expiresAt: Iso;
  endedAt?: Iso;
  /** Actions taken under the elevated access, as audit event counts and references. */
  actionsRecorded: number;
  evidence: Evidence[];
}

/** Who viewed or exported a restricted commercial or security field (spec §23). */
export interface SensitiveAccessEvent {
  id: string;
  at: Iso;
  staffId: string;
  action: "viewed" | "exported";
  classification: "commercial" | "security";
  field: string;
  objectType: string;
  objectId: string;
  customerId?: string;
  purpose: string;
}

/** Weekly security signals behind the posture trend. */
export interface SecuritySignalWeek {
  week: Iso;
  failedAdminAuth: number;
  revokeRequests: number;
  openFindings: number;
}

// Financial intelligence (spec §22) ------------------------------------------------------

/** Finance-approved conversion rates; amounts are never converted without one (spec §22). */
export interface FxRates {
  source: string;
  asOf: Iso;
  /** GBP per one unit of each currency. */
  toGbp: Record<CurrencyCode, number>;
}

/** Approved blended labor rates used to cost support and operations time. */
export interface LaborRates {
  source: string;
  supportPerHour: Money;
  operationsPerHour: Money;
}

/** How a cloud cost line is tagged: to one customer, to one product, or not at all. */
export type CostTag = "customer" | "product" | "untagged";

/** Apporine cloud cost line from the AWS cost export, by account and tags. */
export interface CloudCostLine {
  month: string;
  account: string;
  service: string;
  tag: CostTag;
  productId?: string;
  customerId?: string;
  amount: Money;
}

/** Approved support and operations time per customer per month. */
export interface ServiceTime {
  month: string;
  customerId: string;
  supportHours: number;
  operationsHours: number;
}

/** External source behind finance figures and its freshness. */
export interface CostSource {
  id: string;
  name: string;
  system: string;
  covers: string;
  state: "current" | "delayed" | "unavailable";
  lastSyncedAt: Iso;
}
