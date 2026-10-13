import {
  decisionCopy,
  decisionGuard,
  effectiveState,
  filterApprovals,
  formatTimeRemaining,
  isExpiring,
  myDecisions,
  parseApprovalView,
  targetHref,
  viewCounts,
  windowElapsed,
} from "./approvals";
import type { ApprovalRequest } from "./types";

const now = new Date("2026-10-13T09:00:00Z");
const me = "stf_01";

function request(overrides: Partial<ApprovalRequest>): ApprovalRequest {
  return {
    id: "apr_x",
    type: "license_renew",
    state: "pending",
    highImpact: false,
    requesterId: "stf_02",
    excludedApproverIds: ["stf_02"],
    approverIds: [me, "stf_05"],
    targetType: "license",
    targetId: "LIC_1",
    title: "Renew",
    reason: "Renewal",
    impact: [],
    diff: [],
    policy: [],
    requiresStepUp: false,
    createdAt: "2026-10-10T09:00:00Z",
    expiresAt: "2026-10-17T09:00:00Z",
    ...overrides,
  };
}

const waitingOnMe = request({ id: "a" });
const myOwn = request({ id: "b", requesterId: me, excludedApproverIds: [me] });
const othersHighImpact = request({
  id: "c",
  highImpact: true,
  approverIds: ["stf_05"],
  expiresAt: "2026-10-13T20:00:00Z",
});
const lapsed = request({ id: "d", expiresAt: "2026-10-12T09:00:00Z" });
const decidedByMe = request({
  id: "e",
  state: "approved",
  decidedById: me,
  decidedAt: "2026-10-06T11:00:00Z",
});
const all = [waitingOnMe, myOwn, othersHighImpact, lapsed, decidedByMe];

describe("approval state", () => {
  it("treats a pending request past expiry as expired", () => {
    expect(effectiveState(lapsed, now)).toBe("expired");
    expect(effectiveState(waitingOnMe, now)).toBe("pending");
    expect(effectiveState(decidedByMe, now)).toBe("approved");
  });

  it("marks requests with under a day left as expiring", () => {
    expect(isExpiring(othersHighImpact, now)).toBe(true);
    expect(isExpiring(waitingOnMe, now)).toBe(false);
    expect(isExpiring(lapsed, now)).toBe(false);
  });

  it("reports how much of the window has elapsed", () => {
    expect(windowElapsed(waitingOnMe, now)).toBeCloseTo(3 / 7);
    expect(windowElapsed(lapsed, now)).toBe(1);
    expect(windowElapsed(request({ expiresAt: "2026-10-10T09:00:00Z" }), now)).toBe(1);
  });

  it("formats time remaining at a readable grain", () => {
    expect(formatTimeRemaining(0)).toBe("Expired");
    expect(formatTimeRemaining(60_000)).toBe("1 minute left");
    expect(formatTimeRemaining(40 * 60_000)).toBe("40 minutes left");
    expect(formatTimeRemaining(5 * 3_600_000)).toBe("5 hours left");
    expect(formatTimeRemaining(4 * 86_400_000)).toBe("4 days left");
  });
});

describe("decision guard", () => {
  it("lets an eligible approver decide", () => {
    expect(decisionGuard(waitingOnMe, me, now)).toEqual({ canDecide: true });
  });

  it("prevents self approval", () => {
    expect(decisionGuard(myOwn, me, now)).toMatchObject({
      canDecide: false,
      block: "self_approval",
    });
  });

  it("blocks staff who are not listed approvers", () => {
    expect(decisionGuard(othersHighImpact, me, now).block).toBe("not_approver");
  });

  it("keeps decided and expired requests final", () => {
    expect(decisionGuard(decidedByMe, me, now)).toMatchObject({
      block: "decided",
      reason: expect.stringMatching(/approved\. Decisions are final/),
    });
    expect(decisionGuard(lapsed, me, now).block).toBe("expired");
  });
});

describe("queue views", () => {
  it("parses the view from the query string, defaulting to Mine", () => {
    expect(parseApprovalView("decided")).toBe("decided");
    expect(parseApprovalView(["expiring", "all"])).toBe("expiring");
    expect(parseApprovalView("nope")).toBe("mine");
    expect(parseApprovalView(undefined)).toBe("mine");
  });

  it("filters each view", () => {
    const ids = (view: Parameters<typeof filterApprovals>[1]) =>
      filterApprovals(all, view, me, now).map((r) => r.id);
    expect(ids("mine")).toEqual(["a"]);
    expect(ids("team")).toEqual(["c", "a", "b"]);
    expect(ids("high_impact")).toEqual(["c"]);
    expect(ids("expiring")).toEqual(["c"]);
    expect(ids("decided")).toEqual(["d", "e"]);
    expect(ids("all")).toHaveLength(5);
  });

  it("counts every view in one pass", () => {
    expect(viewCounts(all, me, now)).toEqual({
      mine: 1,
      team: 3,
      high_impact: 1,
      expiring: 1,
      decided: 2,
      all: 5,
    });
  });

  it("lists my decisions newest first", () => {
    const older = request({ id: "f", state: "rejected", decidedById: me, decidedAt: "2026-09-01" });
    expect(myDecisions([older, decidedByMe, waitingOnMe], me).map((r) => r.id)).toEqual(["e", "f"]);
  });
});

describe("targets and copy", () => {
  it("links each target type", () => {
    expect(targetHref(waitingOnMe)).toBe("/licensing/LIC_1");
    expect(
      targetHref(request({ targetType: "entitlement", customerId: "cus_1", targetId: "ent" })),
    ).toBe("/customers/cus_1?tab=entitlements");
    expect(targetHref(request({ targetType: "entitlement", targetId: "ent" }))).toBeUndefined();
    expect(targetHref(request({ targetType: "contract_line", customerId: "cus_1" }))).toBe(
      "/customers/cus_1?tab=contracts",
    );
    expect(targetHref(request({ targetType: "signing_key" }))).toBe("/security");
  });

  it("uses the spec §31 decision copy", () => {
    expect(decisionCopy.approve.title).toBe("Approve governed action");
    expect(decisionCopy.reject.message).toMatch(/permanent decision history/);
  });
});
