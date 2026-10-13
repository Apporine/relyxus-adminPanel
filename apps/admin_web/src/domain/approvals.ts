import type { ApprovalRequest, ApprovalState, ApprovalType } from "./types";

export type ApprovalView = "mine" | "team" | "high_impact" | "expiring" | "decided" | "all";

/** Queue views in spec order (§21). */
export const approvalViews: { id: ApprovalView; label: string }[] = [
  { id: "mine", label: "Mine" },
  { id: "team", label: "Team" },
  { id: "high_impact", label: "High impact" },
  { id: "expiring", label: "Expiring" },
  { id: "decided", label: "Decided" },
  { id: "all", label: "All" },
];

export function parseApprovalView(value: string | string[] | undefined): ApprovalView {
  const candidate = Array.isArray(value) ? value[0] : value;
  return approvalViews.some((v) => v.id === candidate) ? (candidate as ApprovalView) : "mine";
}

/** A pending request with less than this left is "expiring". */
export const EXPIRING_WINDOW_MS = 24 * 60 * 60 * 1000;

/** A pending request past its expiry is expired, even before a worker records it. */
export function effectiveState(request: ApprovalRequest, now: Date): ApprovalState {
  if (request.state === "pending" && new Date(request.expiresAt).getTime() <= now.getTime()) {
    return "expired";
  }
  return request.state;
}

export function isOpen(request: ApprovalRequest, now: Date): boolean {
  return effectiveState(request, now) === "pending";
}

export function msRemaining(request: ApprovalRequest, now: Date): number {
  return Math.max(0, new Date(request.expiresAt).getTime() - now.getTime());
}

export function isExpiring(request: ApprovalRequest, now: Date): boolean {
  return isOpen(request, now) && msRemaining(request, now) <= EXPIRING_WINDOW_MS;
}

/** Share of the approval window already used, 0 to 1. */
export function windowElapsed(request: ApprovalRequest, now: Date): number {
  const start = new Date(request.createdAt).getTime();
  const end = new Date(request.expiresAt).getTime();
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
}

/** "3 days left", "5 hours left", "40 minutes left". */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Expired";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} ${minutes === 1 ? "minute" : "minutes"} left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} ${hours === 1 ? "hour" : "hours"} left`;
  const days = Math.floor(hours / 24);
  return `${days} days left`;
}

export type DecisionBlock = "self_approval" | "not_approver" | "decided" | "expired";

export interface DecisionGuard {
  canDecide: boolean;
  block?: DecisionBlock;
  /** Explains why the decision controls are unavailable. */
  reason?: string;
}

/**
 * Who may decide (spec §21, §5): only a listed approver, never the requester or anyone
 * excluded by segregation of duties, and only while the request is pending. Decisions
 * are final; reopening needs a new request.
 */
export function decisionGuard(request: ApprovalRequest, staffId: string, now: Date): DecisionGuard {
  const state = effectiveState(request, now);
  if (state === "expired") {
    return {
      canDecide: false,
      block: "expired",
      reason: "This request expired without a decision. Reopening needs a new request.",
    };
  }
  if (state !== "pending") {
    return {
      canDecide: false,
      block: "decided",
      reason: `This request was ${state}. Decisions are final; reopening needs a new request.`,
    };
  }
  if (request.requesterId === staffId || request.excludedApproverIds.includes(staffId)) {
    return {
      canDecide: false,
      block: "self_approval",
      reason: "You requested this change. Policy requires a second person to decide it.",
    };
  }
  if (!request.approverIds.includes(staffId)) {
    return {
      canDecide: false,
      block: "not_approver",
      reason: "You are not an eligible approver for this request.",
    };
  }
  return { canDecide: true };
}

export function inView(
  request: ApprovalRequest,
  view: ApprovalView,
  staffId: string,
  now: Date,
): boolean {
  const open = isOpen(request, now);
  switch (view) {
    case "mine":
      return decisionGuard(request, staffId, now).canDecide;
    case "team":
      return open;
    case "high_impact":
      return open && request.highImpact;
    case "expiring":
      return isExpiring(request, now);
    case "decided":
      return !open;
    case "all":
      return true;
  }
}

/** Open requests soonest to expire first; decided requests most recent first. */
export function sortForQueue(requests: ApprovalRequest[], now: Date): ApprovalRequest[] {
  return [...requests].sort((a, b) => {
    const aOpen = isOpen(a, now);
    const bOpen = isOpen(b, now);
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    if (aOpen) return a.expiresAt.localeCompare(b.expiresAt);
    return (b.decidedAt ?? b.expiresAt).localeCompare(a.decidedAt ?? a.expiresAt);
  });
}

export function filterApprovals(
  requests: ApprovalRequest[],
  view: ApprovalView,
  staffId: string,
  now: Date,
): ApprovalRequest[] {
  return sortForQueue(
    requests.filter((r) => inView(r, view, staffId, now)),
    now,
  );
}

export function viewCounts(
  requests: ApprovalRequest[],
  staffId: string,
  now: Date,
): Record<ApprovalView, number> {
  const counts = Object.fromEntries(approvalViews.map((v) => [v.id, 0])) as Record<
    ApprovalView,
    number
  >;
  for (const request of requests) {
    for (const { id } of approvalViews) {
      if (inView(request, id, staffId, now)) counts[id] += 1;
    }
  }
  return counts;
}

export function myDecisions(requests: ApprovalRequest[], staffId: string): ApprovalRequest[] {
  return requests
    .filter((r) => r.decidedById === staffId)
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));
}

/** Context a decider needs for each request type (spec §21). */
export const requiredContext: Record<ApprovalType, string[]> = {
  license_issue: [
    "Customer",
    "Contract source",
    "Entitlement diff",
    "Validity",
    "Deployment allowance",
  ],
  license_renew: ["Customer", "Contract source", "Validity", "Deployment allowance"],
  license_suspend: ["Reason", "Affected deployments", "Grace behavior"],
  license_revoke: [
    "Impact",
    "Reason",
    "Affected deployments",
    "Grace behavior",
    "Customer communication state",
  ],
  entitlement_change: ["Before and after", "Source contract", "Effective date"],
  signing_key_rotation: [
    "Current key",
    "Next key",
    "Overlap window",
    "Affected verifiers",
    "Rollback plan",
  ],
  break_glass: ["Incident reference", "Requested scope", "Expiry", "Observer or approver"],
  security_policy_change: ["Policy diff", "Affected roles", "Risk", "Rollback"],
};

/** Where "Open target" leads. */
export function targetHref(request: ApprovalRequest): string | undefined {
  switch (request.targetType) {
    case "license":
      return `/licensing/${request.targetId}`;
    case "contract_line":
      return request.customerId ? `/customers/${request.customerId}?tab=contracts` : undefined;
    case "entitlement":
      return request.customerId ? `/customers/${request.customerId}?tab=entitlements` : undefined;
    case "signing_key":
    case "staff":
    case "policy":
      return "/security";
  }
}

/** Copy for the decision dialogs (spec §31). */
export const decisionCopy = {
  approve: {
    label: "Approve",
    title: "Approve governed action",
    message:
      "By approving, you confirm that the request, impact and supporting evidence meet the required policy.",
  },
  reject: {
    label: "Reject",
    title: "Reject governed action",
    message: "Enter a clear reason. The rejection becomes part of the permanent decision history.",
  },
  requestChanges: {
    label: "Request changes",
    title: "Request changes",
    message:
      "Explain what the requester must change. The request stays pending and the requester is notified.",
  },
} as const;
