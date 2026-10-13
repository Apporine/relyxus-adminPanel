import {
  auditAnalytics,
  auditCategory,
  auditFilterParams,
  canViewChanges,
  chainAuditEvents,
  correlatedEvents,
  filterAudit,
  parseAuditFilters,
  verifyAuditChain,
} from "./audit";
import type { AuditEvent } from "./types";

const now = "2026-10-13T09:00:00Z";

function event(id: string, overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id,
    at: "2026-10-12T10:00:00Z",
    actorId: "stf_01",
    action: "customer.update",
    actionLabel: "Updated customer",
    objectType: "customer",
    objectId: "cus_a",
    result: "success",
    requestId: `req_${id}`,
    correlationId: `cor_${id}`,
    source: "web",
    highImpact: false,
    ...overrides,
  };
}

const known = { actors: ["stf_01", "stf_02"], products: ["prd_a"], customers: ["cus_a"] };

describe("categories", () => {
  it("derives the category from the action key", () => {
    expect(auditCategory("license.revoke.request")).toBe("licensing");
    expect(auditCategory("break_glass.activate")).toBe("access");
    expect(auditCategory("export.report")).toBe("exports");
    expect(auditCategory("integration.crm_sync")).toBe("integrations");
  });
});

describe("filters", () => {
  it("parses known values and drops unknown ones", () => {
    const f = parseAuditFilters(
      { range: "7d", actor: "stf_09", result: "denied", impact: "high", q: "  LIC_1 " },
      known,
    );
    expect(f).toMatchObject({ range: "7d", actor: undefined, result: "denied", impact: "high" });
    expect(f.q).toBe("LIC_1");
    expect(parseAuditFilters({}, known).range).toBe("14d");
  });

  it("keeps only non-default values in URL params", () => {
    expect(auditFilterParams(parseAuditFilters({ result: "failure" }, known))).toEqual({
      result: "failure",
    });
  });

  it("filters by time range, fields and text", () => {
    const events = [
      event("a"),
      event("b", { at: "2026-10-01T10:00:00Z" }),
      event("c", { actorId: "stf_02", result: "denied", reason: "Missing role" }),
      event("d", { highImpact: true, requestId: "req_special" }),
    ];
    const base = parseAuditFilters({}, known);
    expect(filterAudit(events, base, now).map((e) => e.id)).toEqual(["a", "b", "c", "d"]);
    expect(filterAudit(events, { ...base, range: "7d" }, now).map((e) => e.id)).toEqual([
      "a",
      "c",
      "d",
    ]);
    expect(filterAudit(events, { ...base, actor: "stf_02" }, now).map((e) => e.id)).toEqual(["c"]);
    expect(filterAudit(events, { ...base, impact: "high" }, now).map((e) => e.id)).toEqual(["d"]);
    expect(filterAudit(events, { ...base, q: "missing" }, now).map((e) => e.id)).toEqual(["c"]);
    expect(filterAudit(events, { ...base, q: "REQ_SPECIAL" }, now).map((e) => e.id)).toEqual(["d"]);
  });
});

describe("analytics", () => {
  it("summarises the events it is given", () => {
    const events = [
      event("a", { productId: "prd_a", customerId: "cus_a" }),
      event("b", { result: "denied", actorId: "stf_02", action: "license.download" }),
      event("c", { result: "denied", actorId: "stf_02", action: "license.download" }),
      event("d", { action: "export.report", sensitivity: "commercial", highImpact: true }),
      event("e", { at: "2026-10-13T08:00:00Z", result: "failure" }),
    ];
    const a = auditAnalytics(events, now, 2);
    expect(a.total).toBe(5);
    expect(a.failures).toBe(3);
    expect(a.failureRate).toBeCloseTo(0.6);
    expect(a.daily).toEqual([
      { date: "2026-10-12", success: 2, failed: 2 },
      { date: "2026-10-13", success: 0, failed: 1 },
    ]);
    expect(a.uniqueActors).toBe(2);
    expect(a.topActors[0]).toEqual({ id: "stf_01", count: 3 });
    expect(a.products).toEqual([{ id: "prd_a", count: 1 }]);
    expect(a.highImpact.map((e) => e.id)).toEqual(["d"]);
    expect(a.repeatedDenials).toEqual([
      { actorId: "stf_02", action: "license.download", count: 2 },
    ]);
    expect(a).toMatchObject({ exports: 1, sensitiveExports: 1 });
  });
});

describe("integrity", () => {
  it("chains events oldest first and verifies the chain", () => {
    const chained = chainAuditEvents([
      event("b", { at: "2026-10-12T11:00:00Z" }),
      event("a", { at: "2026-10-12T10:00:00Z" }),
    ]);
    expect(chained.map((e) => [e.id, e.sequence])).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
    expect(chained[1]!.previousHash).toBe(chained[0]!.hash);
    expect(verifyAuditChain(chained)).toMatchObject({ intact: true, checked: 2 });
  });

  it("detects a changed event", () => {
    const chained = chainAuditEvents([event("a"), event("b", { at: "2026-10-12T11:00:00Z" })]);
    const tampered = [chained[0]!, { ...chained[1]!, reason: "edited later" }];
    expect(verifyAuditChain(tampered)).toEqual({ intact: false, checked: 2, brokenAt: 2 });
  });
});

describe("permissions and correlation", () => {
  it("masks restricted changes without field permission", () => {
    const security = event("a", { sensitivity: "security" });
    const commercial = event("b", { sensitivity: "commercial" });
    expect(canViewChanges({ roles: ["auditor"] }, security)).toBe(true);
    expect(canViewChanges({ roles: ["customer_success"] }, security)).toBe(false);
    expect(canViewChanges({ roles: ["finance_viewer"] }, commercial)).toBe(true);
    expect(canViewChanges({ roles: ["support_engineer"] }, commercial)).toBe(false);
    expect(canViewChanges({ roles: [] }, event("c"))).toBe(true);
  });

  it("lists every event of one correlation, oldest first", () => {
    const events = [
      event("b", { correlationId: "cor_x", at: "2026-10-12T11:00:00Z" }),
      event("a", { correlationId: "cor_x" }),
      event("c"),
    ];
    expect(correlatedEvents(events, events[0]!).map((e) => e.id)).toEqual(["a", "b"]);
  });
});
