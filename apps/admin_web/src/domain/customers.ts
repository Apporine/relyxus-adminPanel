import { daysUntil } from "@/lib/format";
import type {
  Customer,
  Deployment,
  HealthStatus,
  License,
  LicenseState,
  LifecycleStage,
  Money,
  Product,
  Region,
  RoleKey,
  StaffUser,
} from "./types";

// Permissions ------------------------------------------------------------------------------

const commercialReaders: RoleKey[] = [
  "commercial_operations",
  "finance_viewer",
  "executive_viewer",
  "portfolio_admin",
];

/** Commercial fields are hidden from staff without finance or commercial read (spec §30.1). */
export function canViewCommercial(staff: Pick<StaffUser, "roles">): boolean {
  return staff.roles.some((role) => commercialReaders.includes(role));
}

// Rows ----------------------------------------------------------------------------------------

/** Most severe first; a customer's license state is its worst license. */
const licenseSeverity: LicenseState[] = [
  "revoked",
  "expired",
  "verification_failed",
  "suspended",
  "grace",
  "active",
  "superseded",
];

export function worstLicenseState(
  licenses: Array<Pick<License, "state">>,
): LicenseState | undefined {
  return licenseSeverity.find((state) => licenses.some((l) => l.state === state));
}

export interface CustomerRow {
  id: string;
  name: string;
  legalName: string;
  status: Customer["status"];
  productCodes: string[];
  productIds: string[];
  lifecycleStage: LifecycleStage;
  health: HealthStatus;
  region: Region;
  renewalAt?: string;
  renewalDays?: number;
  annualContractValue?: Money;
  commercialOwnerId?: string;
  successOwnerId?: string;
  ownerIds: string[];
  licenseState?: LicenseState;
  deploymentCount: number;
  lastActivityAt: string;
  duplicateOfId?: string;
}

export function buildCustomerRows(input: {
  customers: Customer[];
  products: Product[];
  licenses: License[];
  deployments: Deployment[];
  now: string;
}): CustomerRow[] {
  const codes = new Map(input.products.map((p) => [p.id, p.code]));
  const duplicates = findSuspectedDuplicates(input.customers);
  return input.customers.map((c) => ({
    id: c.id,
    name: c.displayName,
    legalName: c.legalName,
    status: c.status,
    productCodes: c.productIds.map((id) => codes.get(id) ?? id),
    productIds: c.productIds,
    lifecycleStage: c.lifecycleStage,
    health: c.health,
    region: c.region,
    renewalAt: c.nextRenewalAt,
    renewalDays: c.nextRenewalAt ? daysUntil(c.nextRenewalAt, input.now) : undefined,
    annualContractValue: c.annualContractValue,
    commercialOwnerId: c.owners.commercial_owner,
    successOwnerId: c.owners.customer_success_owner,
    ownerIds: [...new Set(Object.values(c.owners))],
    licenseState: worstLicenseState(input.licenses.filter((l) => l.customerId === c.id)),
    deploymentCount: input.deployments.filter((d) => d.customerId === c.id).length,
    lastActivityAt: c.lastActivityAt,
    duplicateOfId: duplicates.get(c.id),
  }));
}

// Duplicates ---------------------------------------------------------------------------------

const legalSuffixes = /\b(ltd|limited|plc|inc|llc|llp|ag|sa|bv|pjsc|pte|group|holdings|uk|the)\b/g;

export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(legalSuffixes, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Suggests likely duplicate records: same normalised legal or display name in the same
 * country, excluding parent and subsidiary pairs. Suggestions only; records are never
 * merged automatically (spec §27). The newer record points at the older one.
 */
export function findSuspectedDuplicates(customers: Customer[]): Map<string, string> {
  const result = new Map<string, string>();
  const ordered = [...customers].sort((a, b) => a.customerSince.localeCompare(b.customerSince));
  ordered.forEach((later, index) => {
    const keys = new Set([normaliseName(later.legalName), normaliseName(later.displayName)]);
    const earlier = ordered
      .slice(0, index)
      .find(
        (candidate) =>
          candidate.headquartersCountry === later.headquartersCountry &&
          candidate.id !== later.parentId &&
          candidate.parentId !== later.id &&
          (keys.has(normaliseName(candidate.legalName)) ||
            keys.has(normaliseName(candidate.displayName))),
      );
    if (earlier) result.set(later.id, earlier.id);
  });
  return result;
}

// Filters and views ----------------------------------------------------------------------------

export type RenewalWindowDays = 30 | 60 | 90 | 120;

export interface CustomerFilters {
  q: string;
  health?: HealthStatus;
  stage?: LifecycleStage;
  region?: Region;
  product?: string;
  owner?: string;
  renewal?: RenewalWindowDays;
  status?: Customer["status"];
}

export const emptyCustomerFilters: CustomerFilters = { q: "" };

export interface SavedView {
  id: string;
  label: string;
  filters: CustomerFilters;
  /** Team views are shared; private views belong to one person (spec §26). */
  scope: "team" | "private";
}

export const savedViews: SavedView[] = [
  { id: "all", label: "All customers", filters: emptyCustomerFilters, scope: "team" },
  { id: "at-risk", label: "At risk", filters: { q: "", health: "at_risk" }, scope: "team" },
  { id: "renewing", label: "Renewing in 90 days", filters: { q: "", renewal: 90 }, scope: "team" },
  {
    id: "onboarding",
    label: "Onboarding",
    filters: { q: "", status: "onboarding" },
    scope: "team",
  },
  { id: "mine", label: "My accounts", filters: { q: "", owner: "stf_01" }, scope: "private" },
];

/**
 * Matches the operator search: name, legal name, ID, owner name, product, region, or a
 * renewal phrase such as "renewal 60" (spec §30.1 acceptance).
 */
export function filterCustomerRows(
  rows: CustomerRow[],
  filters: CustomerFilters,
  ownerNames: Record<string, string>,
): CustomerRow[] {
  const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (filters.health && row.health !== filters.health) return false;
    if (filters.stage && row.lifecycleStage !== filters.stage) return false;
    if (filters.region && row.region !== filters.region) return false;
    if (filters.product && !row.productIds.includes(filters.product)) return false;
    if (filters.owner && !row.ownerIds.includes(filters.owner)) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.renewal) {
      if (row.renewalDays === undefined || row.renewalDays < 0 || row.renewalDays > filters.renewal)
        return false;
    }
    if (terms.length === 0) return true;
    const haystack = [
      row.name,
      row.legalName,
      row.id,
      row.region,
      ...row.productCodes,
      ...row.ownerIds.map((id) => ownerNames[id] ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export type CustomerSortKey = "name" | "health" | "renewal" | "value" | "deployments" | "activity";

const healthRank: Record<HealthStatus, number> = { critical: 0, at_risk: 1, watch: 2, healthy: 3 };

export function sortCustomerRows(
  rows: CustomerRow[],
  key: CustomerSortKey,
  direction: "ascending" | "descending",
): CustomerRow[] {
  const sign = direction === "ascending" ? 1 : -1;
  const value = (row: CustomerRow): number | string => {
    switch (key) {
      case "name":
        return row.name.toLowerCase();
      case "health":
        return healthRank[row.health];
      case "renewal":
        return row.renewalDays ?? Number.POSITIVE_INFINITY;
      case "value":
        // Mixed currencies are not comparable; sort by currency, then amount.
        return row.annualContractValue
          ? `${row.annualContractValue.currency}${String(row.annualContractValue.amountMinor).padStart(15, "0")}`
          : "";
      case "deployments":
        return row.deploymentCount;
      case "activity":
        return row.lastActivityAt;
    }
  };
  return [...rows].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av === bv) return a.name.localeCompare(b.name);
    return av < bv ? -sign : sign;
  });
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Initial list filters from the URL; a saved view wins over loose parameters. */
export function parseCustomerFilters(
  params: RawParams,
  known: { productIds: string[]; staffIds: string[] },
): CustomerFilters {
  const view = savedViews.find((v) => v.id === first(params.view));
  if (view) return view.filters;
  const pick = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
    allowed.find((candidate) => candidate === value);
  const renewal = Number(first(params.renewal));
  return {
    q: first(params.q)?.slice(0, 100) ?? "",
    health: pick(first(params.health), ["healthy", "watch", "at_risk", "critical"] as const),
    stage: pick(first(params.stage), [
      "commercial_handoff",
      "security_review",
      "architecture_discovery",
      "pilot_ready",
      "deployment_ready",
      "go_live",
      "stable",
      "renewal",
      "offboarding",
    ] as const),
    region: pick(first(params.region), [
      "UK",
      "EU",
      "North America",
      "Middle East",
      "APAC",
    ] as const),
    product: pick(first(params.product), known.productIds),
    owner: pick(first(params.owner), known.staffIds),
    renewal: ([30, 60, 90, 120] as const).find((d) => d === renewal),
    status: pick(first(params.status), ["active", "onboarding", "suspended", "churned"] as const),
  };
}
