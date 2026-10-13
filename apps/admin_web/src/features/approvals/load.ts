import "server-only";

import {
  decisionGuard,
  effectiveState,
  filterApprovals,
  myDecisions,
  targetHref,
  viewCounts,
  type ApprovalView,
} from "@/domain/approvals";
import type { ApprovalRequest } from "@/domain/types";
import {
  getApproval,
  getCurrentStaff,
  getReferenceTime,
  getStaffDirectory,
  listApprovals,
  listAuditEvents,
  listCustomers,
} from "@/server/data";

async function context() {
  const [reference, me, staff, customers] = await Promise.all([
    getReferenceTime(),
    getCurrentStaff(),
    getStaffDirectory(),
    listCustomers(),
  ]);
  return {
    now: new Date(reference),
    me,
    staff,
    customerNames: Object.fromEntries(customers.map((c) => [c.id, c.displayName])) as Record<
      string,
      string
    >,
  };
}

export type ApprovalContext = Awaited<ReturnType<typeof context>>;

/** Approval queue for one view (spec §21, §30.1). */
export async function loadQueue(view: ApprovalView) {
  const [ctx, approvals] = await Promise.all([context(), listApprovals()]);
  return {
    ...ctx,
    view,
    counts: viewCounts(approvals, ctx.me.id, ctx.now),
    items: filterApprovals(approvals, view, ctx.me.id, ctx.now),
  };
}

export type QueueData = Awaited<ReturnType<typeof loadQueue>>;

/** Requests the current staff member decided. */
export async function loadMyDecisions() {
  const [ctx, approvals] = await Promise.all([context(), listApprovals()]);
  return { ...ctx, items: myDecisions(approvals, ctx.me.id) };
}

export interface HistoryEntry {
  at: string;
  actorId?: string;
  label: string;
  note?: string;
}

/** Request lifecycle as recorded on the request itself; decisions are immutable. */
function historyOf(request: ApprovalRequest, now: Date): HistoryEntry[] {
  const entries: HistoryEntry[] = [
    {
      at: request.createdAt,
      actorId: request.requesterId,
      label: "Requested",
      note: request.reason,
    },
  ];
  const state = effectiveState(request, now);
  if (state === "approved" || state === "rejected") {
    entries.push({
      at: request.decidedAt ?? request.expiresAt,
      actorId: request.decidedById,
      label: state === "approved" ? "Approved" : "Rejected",
      note: request.decisionReason,
    });
  } else if (state === "cancelled") {
    entries.push({
      at: request.decidedAt ?? request.expiresAt,
      actorId: request.requesterId,
      label: "Cancelled",
      note: request.decisionReason,
    });
  } else if (state === "expired") {
    entries.push({ at: request.expiresAt, label: "Expired without a decision" });
  }
  return entries;
}

/** Approval detail: the request, who may decide it and its recorded history. */
export async function loadApproval(id: string) {
  const request = await getApproval(id);
  if (!request) return undefined;
  const [ctx, audit] = await Promise.all([context(), listAuditEvents()]);
  return {
    ...ctx,
    request,
    state: effectiveState(request, ctx.now),
    guard: decisionGuard(request, ctx.me.id, ctx.now),
    target: targetHref(request),
    history: historyOf(request, ctx.now),
    audit: audit.filter((e) => e.objectId === request.id || e.requestId === request.id),
  };
}

export type ApprovalDetailData = NonNullable<Awaited<ReturnType<typeof loadApproval>>>;
