import type {
  Contact,
  Contract,
  Customer,
  CustomerEntitlement,
  Deployment,
  Iso,
  License,
  LifecycleStage,
  OwnerRole,
} from "./types";

/**
 * Data quality (spec §27): checks operators can act on, an explainable completeness
 * score, and duplicate suggestions that never merge anything automatically.
 */

export type DataQualityCheck =
  | "missing_owner"
  | "missing_renewal_date"
  | "inactive_contact"
  | "orphaned_deployment"
  | "duplicate_customer"
  | "license_without_entitlement"
  | "contract_without_scope"
  | "stale_external_reference";

export const checkLabel: Record<DataQualityCheck, string> = {
  missing_owner: "Missing owners",
  missing_renewal_date: "Missing renewal dates",
  inactive_contact: "Inactive or unverified key contacts",
  orphaned_deployment: "Orphaned deployments",
  duplicate_customer: "Possible duplicate customers",
  license_without_entitlement: "Licenses without a source entitlement",
  contract_without_scope: "Contracts without product scope",
  stale_external_reference: "Stale external references",
};

export interface DataQualityIssue {
  id: string;
  check: DataQualityCheck;
  customerId?: string;
  recordId: string;
  detail: string;
  href: string;
}

const owner = (role: OwnerRole) => role.replaceAll("_", " ");

/** Owners each lifecycle stage needs; later stages need everyone. */
export function requiredOwners(stage: LifecycleStage): OwnerRole[] {
  const early: OwnerRole[] = ["commercial_owner", "technical_owner"];
  if (stage === "commercial_handoff" || stage === "security_review") return early;
  if (stage === "architecture_discovery" || stage === "pilot_ready") {
    return [...early, "customer_success_owner"];
  }
  return [...early, "customer_success_owner", "support_owner", "executive_sponsor"];
}

export interface CompletenessField {
  field: string;
  present: boolean;
}

const liveStages = new Set<LifecycleStage>(["go_live", "stable", "renewal"]);

/**
 * Record completeness by lifecycle stage: the required fields, which are present, and
 * the share present. The list is the explanation; the score is only its summary.
 */
export function completeness(
  customer: Customer,
  context: { contacts: Contact[]; contracts: Contract[] },
) {
  const contacts = context.contacts.filter((c) => c.customerId === customer.id && c.active);
  const hasContract = context.contracts.some((c) => c.customerId === customer.id);
  const fields: CompletenessField[] = [
    { field: "Legal name", present: Boolean(customer.legalName) },
    { field: "Industry", present: Boolean(customer.industry) },
    { field: "Data residency", present: Boolean(customer.dataResidency) },
    { field: "CRM reference", present: Boolean(customer.references.crmId) },
    ...requiredOwners(customer.lifecycleStage).map((role) => ({
      field: `Owner: ${owner(role)}`,
      present: Boolean(customer.owners[role]),
    })),
    { field: "Technical contact", present: contacts.some((c) => c.roles.includes("technical")) },
  ];
  if (customer.lifecycleStage !== "commercial_handoff") {
    fields.push({
      field: "Security contact",
      present: contacts.some((c) => c.roles.includes("security")),
    });
  }
  if (hasContract || liveStages.has(customer.lifecycleStage)) {
    fields.push(
      { field: "Contract record", present: hasContract },
      { field: "Renewal date", present: Boolean(customer.nextRenewalAt) },
      { field: "Finance reference", present: Boolean(customer.references.financeId) },
      { field: "Executive contact", present: contacts.some((c) => c.roles.includes("executive")) },
    );
  }
  const present = fields.filter((f) => f.present).length;
  return { score: Math.round((present / fields.length) * 100), fields };
}

// Duplicates ------------------------------------------------------------------------------

const noise = new Set([
  "ltd",
  "limited",
  "plc",
  "inc",
  "llc",
  "group",
  "holdings",
  "the",
  "uk",
  "eu",
  "europe",
]);

export function nameTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((t) => t && !noise.has(t)),
  );
}

/** Jaccard similarity of significant name tokens, 0 to 1. */
export function nameSimilarity(a: string, b: string): number {
  const x = nameTokens(a);
  const y = nameTokens(b);
  const shared = [...x].filter((t) => y.has(t)).length;
  const union = new Set([...x, ...y]).size;
  return union ? shared / union : 0;
}

export interface DuplicateCandidate {
  name: string;
  source: string;
  reference: string;
}

export interface DuplicateSuggestion {
  a: { name: string; id?: string; source: string };
  b: { name: string; id?: string; source: string };
  similarity: number;
  reason: string;
}

/**
 * Likely duplicates among customers and incoming CRM records. Related accounts linked by
 * parent are skipped. Suggestions only; merging is a reviewed, manual action.
 */
export function duplicateSuggestions(
  customers: Customer[],
  incoming: DuplicateCandidate[] = [],
  threshold = 0.99,
): DuplicateSuggestion[] {
  const suggestions: DuplicateSuggestion[] = [];
  for (let i = 0; i < customers.length; i++) {
    for (let j = i + 1; j < customers.length; j++) {
      const a = customers[i]!;
      const b = customers[j]!;
      if (a.parentId === b.id || b.parentId === a.id) continue;
      const similarity = nameSimilarity(a.legalName, b.legalName);
      if (similarity >= threshold) {
        suggestions.push({
          a: { name: a.displayName, id: a.id, source: "Control plane" },
          b: { name: b.displayName, id: b.id, source: "Control plane" },
          similarity,
          reason: "Same significant name; no parent link between the accounts.",
        });
      }
    }
  }
  for (const record of incoming) {
    for (const c of customers) {
      const similarity = nameSimilarity(c.legalName, record.name);
      if (similarity >= threshold) {
        suggestions.push({
          a: { name: c.displayName, id: c.id, source: "Control plane" },
          b: { name: record.name, source: `${record.source} ${record.reference}` },
          similarity,
          reason: "Incoming record matches an existing customer.",
        });
      }
    }
  }
  return suggestions.sort((x, y) => y.similarity - x.similarity);
}

// Checks ----------------------------------------------------------------------------------

export interface DataQualityInput {
  now: Iso;
  customers: Customer[];
  contacts: Contact[];
  contracts: Contract[];
  licenses: License[];
  deployments: Deployment[];
  entitlements: CustomerEntitlement[];
  incoming: DuplicateCandidate[];
  /** Last successful sync per external system. */
  syncs: { system: string; lastSyncedAt: Iso; staleAfterHours: number }[];
}

export function dataQualityIssues(input: DataQualityInput): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const customerById = new Map(input.customers.map((c) => [c.id, c]));

  for (const c of input.customers) {
    const missing = requiredOwners(c.lifecycleStage).filter((r) => !c.owners[r]);
    if (missing.length) {
      issues.push({
        id: `owner-${c.id}`,
        check: "missing_owner",
        customerId: c.id,
        recordId: c.id,
        detail: `No ${missing.map(owner).join(", ")}.`,
        href: `/customers/${c.id}`,
      });
    }
    const hasLiveContract = input.contracts.some(
      (k) => k.customerId === c.id && (k.status === "active" || k.status === "renewing"),
    );
    if (hasLiveContract && !c.nextRenewalAt) {
      issues.push({
        id: `renewal-${c.id}`,
        check: "missing_renewal_date",
        customerId: c.id,
        recordId: c.id,
        detail: "Active contract but no renewal date.",
        href: `/customers/${c.id}?tab=contracts`,
      });
    }
  }

  for (const contact of input.contacts) {
    const key = contact.roles.some((r) => r === "executive" || r === "security");
    if (key && (!contact.active || !contact.verified)) {
      issues.push({
        id: `contact-${contact.id}`,
        check: "inactive_contact",
        customerId: contact.customerId,
        recordId: contact.id,
        detail: `${contact.name}, ${contact.roles.join(" and ")} contact, is ${
          contact.active ? "unverified" : "inactive"
        }.`,
        href: `/customers/${contact.customerId}/contacts/${contact.id}`,
      });
    }
  }

  for (const d of input.deployments) {
    const license = d.licenseId ? input.licenses.find((l) => l.id === d.licenseId) : undefined;
    const reason = !customerById.has(d.customerId)
      ? "Customer record not found."
      : !d.licenseId
        ? "No license binding."
        : !license
          ? `License ${d.licenseId} not found.`
          : license.customerId !== d.customerId
            ? `Bound to another customer's license ${license.id}.`
            : undefined;
    if (reason) {
      issues.push({
        id: `deployment-${d.id}`,
        check: "orphaned_deployment",
        customerId: d.customerId,
        recordId: d.id,
        detail: reason,
        href: `/deployments/${d.id}`,
      });
    }
  }

  for (const l of input.licenses) {
    const source = input.entitlements.some(
      (e) => e.customerId === l.customerId && e.productId === l.productId,
    );
    if (!source) {
      issues.push({
        id: `license-${l.id}`,
        check: "license_without_entitlement",
        customerId: l.customerId,
        recordId: l.id,
        detail: "No customer entitlement for this product.",
        href: `/licensing/${l.id}`,
      });
    }
  }

  for (const k of input.contracts) {
    if (!k.productIds.length || !Object.keys(k.scope).length) {
      issues.push({
        id: `contract-${k.id}`,
        check: "contract_without_scope",
        customerId: k.customerId,
        recordId: k.id,
        detail: "No product or entitlement scope on the contract.",
        href: `/commercial/contracts/${k.id}`,
      });
    }
  }

  for (const s of input.syncs) {
    const hours = (Date.parse(input.now) - Date.parse(s.lastSyncedAt)) / 3_600_000;
    if (hours > s.staleAfterHours) {
      issues.push({
        id: `sync-${s.system}`,
        check: "stale_external_reference",
        recordId: s.system,
        detail: `${s.system} last synced ${Math.floor(hours)} hours ago; references may be out of date.`,
        href: "/analytics/data-quality#sources",
      });
    }
  }

  for (const d of duplicateSuggestions(input.customers, input.incoming)) {
    issues.push({
      id: `duplicate-${d.a.id}-${d.b.id ?? d.b.source}`,
      check: "duplicate_customer",
      customerId: d.a.id,
      recordId: d.b.id ?? d.b.source,
      detail: `${d.a.name} and ${d.b.name} (${d.b.source}). ${d.reason}`,
      href: "/analytics/data-quality#duplicates",
    });
  }

  return issues;
}
