import "server-only";

import {
  auditAnalytics,
  auditRanges,
  filterAudit,
  parseAuditFilters,
  type AuditFilters,
} from "@/domain/audit";
import type { AuditEvent } from "@/domain/types";
import {
  getAuditStream,
  getCurrentStaff,
  getReferenceTime,
  getStaffDirectory,
  listApiClients,
  listAuditEvents,
  listAuditExports,
  listCustomers,
  listProducts,
} from "@/server/data";

type Params = Record<string, string | string[] | undefined>;

/**
 * One snapshot for audit screens. The table and every analytic come from the same
 * filtered list, so they always agree (spec §24.1).
 */
export async function loadAudit(params: Params = {}) {
  const [now, me, directory, clients, events, stream, exports, customers, products] =
    await Promise.all([
      getReferenceTime(),
      getCurrentStaff(),
      getStaffDirectory(),
      listApiClients(),
      listAuditEvents(),
      getAuditStream(),
      listAuditExports(),
      listCustomers(),
      listProducts(),
    ]);

  const actors = [...new Set(events.map((e) => e.actorId))];
  const filters: AuditFilters = parseAuditFilters(params, {
    actors,
    products: products.map((p) => p.id),
    customers: customers.map((c) => c.id),
  });
  const filtered = filterAudit(events, filters, now);
  const clientNames = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  const actorName = (id: string) => directory[id]?.name ?? clientNames[id] ?? id;

  return {
    now,
    me,
    events,
    filtered,
    filters,
    analytics: auditAnalytics(filtered, now, auditRanges[filters.range]),
    stream,
    exports,
    actors: actors.sort((a, b) => actorName(a).localeCompare(actorName(b))),
    actorName,
    actorKind: (event: AuditEvent) =>
      event.actorType === "api_client"
        ? "API client"
        : event.actorType === "system"
          ? "System"
          : (directory[event.actorId]?.title ?? "Staff"),
    staffName: (id: string) => directory[id]?.name ?? id,
    customerName: Object.fromEntries(customers.map((c) => [c.id, c.displayName])) as Record<
      string,
      string
    >,
    productName: Object.fromEntries(products.map((p) => [p.id, p.name])) as Record<string, string>,
    customers,
    products,
  };
}

export type AuditData = Awaited<ReturnType<typeof loadAudit>>;
