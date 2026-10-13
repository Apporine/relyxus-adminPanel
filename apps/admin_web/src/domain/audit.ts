import { canViewCommercial } from "./customers";
import type { AuditEvent, AuditResult, Iso, StaffUser } from "./types";

const DAY = 86_400_000;

// Categories ------------------------------------------------------------------------------

export type AuditCategory =
  | "access"
  | "licensing"
  | "keys"
  | "approvals"
  | "commercial"
  | "customers"
  | "deployments"
  | "exports"
  | "integrations";

export const auditCategoryLabel: Record<AuditCategory, string> = {
  access: "Access and sign in",
  licensing: "Licensing",
  keys: "Signing keys",
  approvals: "Approvals",
  commercial: "Commercial",
  customers: "Customers and success",
  deployments: "Deployments and releases",
  exports: "Exports",
  integrations: "Integrations and automation",
};

const prefixCategory: [string, AuditCategory][] = [
  ["staff.", "access"],
  ["role.", "access"],
  ["break_glass.", "access"],
  ["access_review.", "access"],
  ["api_client.", "access"],
  ["license.", "licensing"],
  ["signing_key.", "keys"],
  ["approval.", "approvals"],
  ["contract.", "commercial"],
  ["entitlement.", "commercial"],
  ["renewal.", "commercial"],
  ["customer.", "customers"],
  ["contact.", "customers"],
  ["success_plan.", "customers"],
  ["risk.", "customers"],
  ["deployment.", "deployments"],
  ["release.", "deployments"],
  ["export.", "exports"],
  ["audit.export", "exports"],
  ["report.export", "exports"],
];

/** Category from the stable action key; unknown keys fall under integrations. */
export function auditCategory(action: string): AuditCategory {
  return prefixCategory.find(([prefix]) => action.startsWith(prefix))?.[1] ?? "integrations";
}

export function isExport(event: AuditEvent) {
  return auditCategory(event.action) === "exports";
}

// Filters ---------------------------------------------------------------------------------

export const auditRanges = { "24h": 1, "7d": 7, "14d": 14 } as const;
export type AuditRange = keyof typeof auditRanges;

export interface AuditFilters {
  range: AuditRange;
  q: string;
  actor?: string;
  category?: AuditCategory;
  result?: AuditResult;
  product?: string;
  customer?: string;
  impact?: "high";
  source?: AuditEvent["source"];
}

const results: AuditResult[] = ["success", "failure", "denied"];
const sources: AuditEvent["source"][] = ["web", "api", "automation"];
const categories = Object.keys(auditCategoryLabel) as AuditCategory[];

export function parseAuditFilters(
  params: Record<string, string | string[] | undefined>,
  known: { actors: string[]; products: string[]; customers: string[] },
): AuditFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const pick = <T extends string>(options: readonly T[], value: string | undefined) =>
    options.find((o) => o === value);
  return {
    range: pick(Object.keys(auditRanges) as AuditRange[], first(params.range)) ?? "14d",
    q: first(params.q)?.trim().slice(0, 100) ?? "",
    actor: pick(known.actors, first(params.actor)),
    category: pick(categories, first(params.category)),
    result: pick(results, first(params.result)),
    product: pick(known.products, first(params.product)),
    customer: pick(known.customers, first(params.customer)),
    impact: first(params.impact) === "high" ? "high" : undefined,
    source: pick(sources, first(params.source)),
  };
}

/** Filter values as URL params, without the defaults, for links that keep the view. */
export function auditFilterParams(filters: AuditFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (!value || (key === "range" && value === "14d")) continue;
    params[key] = value;
  }
  return params;
}

export function filterAudit(events: AuditEvent[], filters: AuditFilters, now: Iso) {
  const from = Date.parse(now) - auditRanges[filters.range] * DAY;
  const q = filters.q.toLowerCase();
  return events.filter((e) => {
    if (Date.parse(e.at) <= from || Date.parse(e.at) > Date.parse(now)) return false;
    if (filters.actor && e.actorId !== filters.actor) return false;
    if (filters.category && auditCategory(e.action) !== filters.category) return false;
    if (filters.result && e.result !== filters.result) return false;
    if (filters.product && e.productId !== filters.product) return false;
    if (filters.customer && e.customerId !== filters.customer) return false;
    if (filters.impact && !e.highImpact) return false;
    if (filters.source && e.source !== filters.source) return false;
    if (q) {
      const haystack = [
        e.action,
        e.actionLabel,
        e.objectId,
        e.requestId,
        e.correlationId,
        e.reason ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

// Analytics -------------------------------------------------------------------------------

const countBy = <K extends string>(items: AuditEvent[], key: (e: AuditEvent) => K | undefined) => {
  const counts = new Map<K, number>();
  for (const item of items) {
    const k = key(item);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
};

/**
 * Audit analytics (spec §24.1) over an already filtered event list, so every figure
 * matches the table beside it.
 */
export function auditAnalytics(events: AuditEvent[], now: Iso, days: number) {
  const end = Date.parse(now.slice(0, 10));
  const daily = Array.from({ length: days }, (_, i) => {
    const date = new Date(end - (days - 1 - i) * DAY).toISOString().slice(0, 10);
    const day = events.filter((e) => e.at.startsWith(date));
    const failed = day.filter((e) => e.result !== "success").length;
    return { date, success: day.length - failed, failed };
  });
  const failures = events.filter((e) => e.result !== "success");
  const denials = events.filter((e) => e.result === "denied");
  const exports = events.filter(isExport);

  return {
    total: events.length,
    failures: failures.length,
    failureRate: events.length ? failures.length / events.length : 0,
    daily,
    uniqueActors: new Set(events.map((e) => e.actorId)).size,
    topActors: countBy(events, (e) => e.actorId).slice(0, 5),
    products: countBy(events, (e) => e.productId),
    customers: countBy(events, (e) => e.customerId),
    highImpact: events.filter((e) => e.highImpact),
    /** The same actor denied the same action more than once. */
    repeatedDenials: countBy(denials, (e) => `${e.actorId}|${e.action}`)
      .filter((d) => d.count > 1)
      .map((d) => {
        const [actorId, action] = d.id.split("|") as [string, string];
        return { actorId, action, count: d.count };
      }),
    exports: exports.length,
    sensitiveExports: exports.filter((e) => e.sensitivity).length,
  };
}

// Integrity -------------------------------------------------------------------------------

/** FNV-1a 64-bit over the event's canonical fields and the previous hash. */
export function auditDigest(event: AuditEvent, previousHash: string): string {
  const canonical = [
    previousHash,
    event.id,
    event.at,
    event.actorId,
    event.action,
    event.objectType,
    event.objectId,
    event.result,
    event.requestId,
    event.correlationId,
    event.reason ?? "",
    JSON.stringify(event.changes ?? []),
  ].join("\u001f");
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(canonical)) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}

export const GENESIS_HASH = "0000000000000000";

/** Orders events oldest first and links each to the one before it. */
export function chainAuditEvents(events: AuditEvent[]): AuditEvent[] {
  const ordered = [...events].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  let previousHash = GENESIS_HASH;
  return ordered.map((event, index) => {
    const hash = auditDigest(event, previousHash);
    const linked = { ...event, sequence: index + 1, previousHash, hash };
    previousHash = hash;
    return linked;
  });
}

/** Recomputes the chain; the first event whose hash or link does not match breaks it. */
export function verifyAuditChain(events: AuditEvent[]) {
  const ordered = [...events].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  let previousHash = GENESIS_HASH;
  for (const event of ordered) {
    if (event.previousHash !== previousHash || event.hash !== auditDigest(event, previousHash)) {
      return { intact: false as const, checked: ordered.length, brokenAt: event.sequence };
    }
    previousHash = event.hash;
  }
  return { intact: true as const, checked: ordered.length, head: previousHash };
}

// Permissions -----------------------------------------------------------------------------

/** Before and after values of restricted fields are field permission aware (spec §30). */
export function canViewChanges(staff: Pick<StaffUser, "roles">, event: AuditEvent): boolean {
  if (event.sensitivity === "commercial") return canViewCommercial(staff);
  if (event.sensitivity === "security") {
    return staff.roles.some((r) => r === "security_admin" || r === "auditor");
  }
  return true;
}

/** Events sharing a correlation ID, oldest first: one privileged action end to end. */
export function correlatedEvents(events: AuditEvent[], event: AuditEvent) {
  return events
    .filter((e) => e.correlationId === event.correlationId)
    .sort((a, b) => a.at.localeCompare(b.at));
}
