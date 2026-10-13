import "server-only";

/**
 * Data access for pages (design track). Every function is async and returns domain types
 * so its body can switch from fixtures to the Control API without touching callers.
 */

import { healthStatus, licenseState, supportState } from "@/domain/status";
import type {
  ApprovalRequest,
  AuditEvent,
  Contact,
  Contract,
  Customer,
  Deployment,
  Environment,
  License,
  Product,
  Release,
  StaffUser,
  SuccessMilestone,
  SupportCase,
  Task,
} from "@/domain/types";
import type { SearchResult } from "@/domain/search";
import { contracts, deployments, licenses } from "../fixtures/commercial";
import { contacts, customers } from "../fixtures/customers";
import {
  approvals,
  auditDaily,
  auditEvents,
  auditSummary,
  costImport,
  crmSync,
  costSnapshots,
  healthHistory,
  licenseRiskHistory,
  successMilestones,
  supportCases,
  tasks,
} from "../fixtures/operations";
import { CURRENT_STAFF_ID, REFERENCE_NOW, products, releases, staff } from "../fixtures/staff";

// Session --------------------------------------------------------------------------------

export async function getReferenceTime(): Promise<string> {
  return REFERENCE_NOW;
}

export async function getEnvironment(): Promise<Environment> {
  return "DEVELOPMENT";
}

export async function getCurrentStaff(): Promise<StaffUser> {
  return findOrThrow(staff, CURRENT_STAFF_ID, "staff user");
}

export async function listStaff(): Promise<StaffUser[]> {
  return staff;
}

/** Staff names by ID, for rendering owners, actors and approvers. */
export async function getStaffDirectory(): Promise<Record<string, StaffUser>> {
  return Object.fromEntries(staff.map((s) => [s.id, s]));
}

// Products ---------------------------------------------------------------------------------

export async function listProducts(): Promise<Product[]> {
  return products;
}

export async function listReleases(productId?: string): Promise<Release[]> {
  return productId ? releases.filter((r) => r.productId === productId) : releases;
}

// Customers --------------------------------------------------------------------------------

export async function listCustomers(): Promise<Customer[]> {
  return customers;
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  return customers.find((c) => c.id === id);
}

export async function listContacts(customerId?: string): Promise<Contact[]> {
  return customerId ? contacts.filter((c) => c.customerId === customerId) : contacts;
}

// Commercial and licensing -----------------------------------------------------------------

export async function listContracts(customerId?: string): Promise<Contract[]> {
  return customerId ? contracts.filter((c) => c.customerId === customerId) : contracts;
}

export async function listLicenses(customerId?: string): Promise<License[]> {
  return customerId ? licenses.filter((l) => l.customerId === customerId) : licenses;
}

export async function getLicense(id: string): Promise<License | undefined> {
  return licenses.find((l) => l.id === id);
}

export async function listDeployments(customerId?: string): Promise<Deployment[]> {
  return customerId ? deployments.filter((d) => d.customerId === customerId) : deployments;
}

// Governance -------------------------------------------------------------------------------

export async function listApprovals(): Promise<ApprovalRequest[]> {
  return approvals;
}

export async function getApproval(id: string): Promise<ApprovalRequest | undefined> {
  return approvals.find((a) => a.id === id);
}

export async function listAuditEvents(customerId?: string): Promise<AuditEvent[]> {
  return customerId ? auditEvents.filter((e) => e.customerId === customerId) : auditEvents;
}

export async function listTasks(): Promise<Task[]> {
  return tasks;
}

export async function listCostSnapshots() {
  return costSnapshots;
}

export async function listHealthHistory() {
  return healthHistory;
}

export async function listLicenseRiskHistory() {
  return licenseRiskHistory;
}

export async function getAuditActivity() {
  return { daily: auditDaily, ...auditSummary };
}

export async function getCostImportStatus() {
  return costImport;
}

export async function getCrmSyncStatus() {
  return crmSync;
}

export async function listSupportCases(customerId?: string): Promise<SupportCase[]> {
  return customerId ? supportCases.filter((c) => c.customerId === customerId) : supportCases;
}

export async function listSuccessMilestones(customerId?: string): Promise<SuccessMilestone[]> {
  return customerId
    ? successMilestones.filter((m) => m.customerId === customerId)
    : successMilestones;
}

// Search -------------------------------------------------------------------------------------

/**
 * Search index across core objects (spec §7.1). Results must be permission filtered once
 * the Control API exists; the API, not the browser, enforces that.
 */
export async function getSearchIndex(): Promise<SearchResult[]> {
  const customerName = (id: string) => customers.find((c) => c.id === id)?.displayName ?? id;
  const productCode = (id: string) => products.find((p) => p.id === id)?.code ?? "";

  return [
    ...customers.map<SearchResult>((c) => ({
      type: "customer",
      id: c.id,
      title: c.displayName,
      subtitle: `${c.id} · ${c.region} · ${healthStatus[c.health].label}`,
      href: `/customers/${c.id}`,
      keywords: [c.legalName, c.industry, c.headquartersCountry],
      status: `${healthStatus[c.health].label} ${c.status}`,
      productCode: c.productIds.map(productCode).join(" "),
    })),
    ...contacts.map<SearchResult>((c) => ({
      type: "contact",
      id: c.id,
      title: c.name,
      subtitle: `${c.title} · ${customerName(c.customerId)}`,
      href: `/customers/${c.customerId}?tab=contacts`,
      keywords: [c.email, customerName(c.customerId)],
      status: c.active ? "active" : "inactive",
    })),
    ...contracts.map<SearchResult>((c) => ({
      type: "contract",
      id: c.id,
      title: c.number,
      subtitle: customerName(c.customerId),
      href: `/customers/${c.customerId}?tab=contracts`,
      keywords: [c.number, customerName(c.customerId)],
      status: c.status,
      productCode: c.productIds.map(productCode).join(" "),
    })),
    ...licenses.map<SearchResult>((l) => ({
      type: "license",
      id: l.id,
      title: l.id,
      subtitle: `${customerName(l.customerId)} · ${licenseState[l.state].label}`,
      href: `/licensing/${l.id}`,
      keywords: [customerName(l.customerId)],
      status: licenseState[l.state].label,
      productCode: productCode(l.productId),
    })),
    ...deployments.map<SearchResult>((d) => ({
      type: "deployment",
      id: d.id,
      title: d.logicalName,
      subtitle: `${customerName(d.customerId)} · ${d.environment} · ${d.releaseVersion}`,
      href: `/deployments/${d.id}`,
      keywords: [
        customerName(d.customerId),
        d.environment,
        d.environment === "production" ? "prod" : "",
        d.region,
        d.platform,
      ],
      status: supportState[d.supportState].label,
      productCode: productCode(d.productId),
    })),
    ...releases.map<SearchResult>((r) => ({
      type: "release",
      id: r.id,
      title: `${productCode(r.productId)} ${r.version}`,
      subtitle: r.status.replaceAll("_", " "),
      href: `/releases/${r.id}`,
      keywords: [r.version],
      status: r.status,
      productCode: productCode(r.productId),
    })),
    ...products.map<SearchResult>((p) => ({
      type: "product",
      id: p.id,
      title: p.name,
      subtitle: `${p.code} · release train ${p.currentReleaseTrain}`,
      href: `/products/${p.id}`,
      keywords: [p.code],
      status: p.status,
      productCode: p.code,
    })),
  ];
}

function findOrThrow<T extends { id: string }>(items: T[], id: string, kind: string): T {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown ${kind}: ${id}`);
  return item;
}
