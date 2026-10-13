import type { HealthFactor } from "./health";
import {
  firstResponseMinutes,
  formatMinutes,
  onboardingProgress,
  recurringIssues,
  slaReport,
  supportPolicy,
  withOverrides,
} from "./success";
import type { HealthOverride, OnboardingItem, SupportCase } from "./types";

const now = "2026-10-13T09:00:00Z";

function supportCase(id: string, overrides: Partial<SupportCase> = {}): SupportCase {
  return {
    id,
    customerId: "cus_a",
    externalRef: id,
    title: "Refresh fails",
    severity: "sev2",
    status: "open",
    openedAt: "2026-10-01T00:00:00Z",
    slaState: "within",
    ownerId: "stf_08",
    releaseVersion: "2.4.1",
    productId: "prd_a",
    ...overrides,
  };
}

describe("support policy and SLA", () => {
  it("tightens response objectives with the support tier", () => {
    expect(supportPolicy.mission_critical.responseMinutes.sev1).toBeLessThan(
      supportPolicy.premium.responseMinutes.sev1,
    );
    expect(supportPolicy.standard.channels).not.toContain("Phone");
  });

  it("measures first response in minutes", () => {
    expect(
      firstResponseMinutes(supportCase("a", { firstResponseAt: "2026-10-01T00:45:00Z" })),
    ).toBe(45);
    expect(firstResponseMinutes(supportCase("a"))).toBeUndefined();
  });

  it("reports volume, breaches, compliance and median first response by severity", () => {
    const report = slaReport([
      supportCase("a", { firstResponseAt: "2026-10-01T00:30:00Z" }),
      supportCase("b", {
        slaState: "breached",
        status: "resolved",
        firstResponseAt: "2026-10-01T01:30:00Z",
      }),
      supportCase("c", { slaState: "at_risk", firstResponseAt: "2026-10-01T02:00:00Z" }),
      supportCase("d", { severity: "sev4", status: "resolved" }),
    ]);
    expect(report[1]).toEqual({
      severity: "sev2",
      total: 3,
      open: 2,
      breached: 1,
      atRisk: 1,
      compliance: 2 / 3,
      medianFirstResponseMinutes: 90,
    });
    expect(report[0]).toMatchObject({
      total: 0,
      compliance: undefined,
      medianFirstResponseMinutes: undefined,
    });
    expect(report[3]).toMatchObject({ total: 1, compliance: 1 });
  });

  it("takes the mean of the middle two for an even count", () => {
    const report = slaReport([
      supportCase("a", { firstResponseAt: "2026-10-01T00:10:00Z" }),
      supportCase("b", { firstResponseAt: "2026-10-01T00:30:00Z" }),
    ]);
    expect(report[1]!.medianFirstResponseMinutes).toBe(20);
  });

  it("formats response times", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(240)).toBe("4 h");
    expect(formatMinutes(1440)).toBe("1 d");
    expect(formatMinutes(1800)).toBe("1 d 6 h");
  });
});

describe("recurring issues", () => {
  it("groups the same issue across customers and releases", () => {
    const issues = recurringIssues([
      supportCase("a", { customerId: "cus_a", releaseVersion: "2.3.1" }),
      supportCase("b", { customerId: "cus_b", title: " refresh FAILS", releaseVersion: "2.4.1" }),
      supportCase("c", { title: "Something else" }),
      supportCase("d", { productId: "prd_b" }),
    ]);
    expect(issues).toEqual([
      {
        title: "Refresh fails",
        productId: "prd_a",
        releases: ["2.3.1", "2.4.1"],
        customerIds: ["cus_a", "cus_b"],
        caseIds: ["a", "b"],
      },
    ]);
  });
});

describe("onboarding progress", () => {
  const item = (id: string, overrides: Partial<OnboardingItem>): OnboardingItem => ({
    id,
    customerId: "cus_a",
    stage: "security_review",
    title: id,
    ownerId: "stf_06",
    dueAt: "2026-10-20T00:00:00Z",
    status: "not_started",
    ...overrides,
  });

  it("counts completion, overdue and blocked items and picks the next due", () => {
    const progress = onboardingProgress(
      "cus_a",
      [
        item("done", { status: "done", dueAt: "2026-10-01T00:00:00Z" }),
        item("late", { status: "in_progress", dueAt: "2026-10-10T00:00:00Z" }),
        item("stuck", { status: "blocked", dependsOn: "late" }),
        item("other", { customerId: "cus_b" }),
      ],
      now,
    );
    expect(progress).toMatchObject({ done: 1, total: 3 });
    expect(progress.overdue.map((i) => i.id)).toEqual(["late"]);
    expect(progress.blocked.map((i) => i.id)).toEqual(["stuck"]);
    expect(progress.next?.id).toBe("late");
  });
});

describe("health overrides", () => {
  const factors = [
    {
      key: "deployment",
      label: "Deployment",
      status: "risk",
      signals: [],
      sources: [],
      impact: 15,
    },
    { key: "support", label: "Support", status: "ok", signals: [], sources: [], impact: 0 },
  ] as unknown as HealthFactor[];
  const override: HealthOverride = {
    customerId: "cus_a",
    factor: "deployment",
    to: "attention",
    reason: "Upgrade scheduled",
    byId: "stf_04",
    expiresAt: "2026-11-01T00:00:00Z",
  };

  it("keeps the calculated status and attaches an unexpired override", () => {
    const [deployment, support] = withOverrides("cus_a", factors, [override], now);
    expect(deployment).toMatchObject({ status: "risk", override: { to: "attention" } });
    expect(support).not.toHaveProperty("override");
  });

  it("ignores expired overrides and other customers", () => {
    expect(
      withOverrides("cus_a", factors, [{ ...override, expiresAt: "2026-10-01T00:00:00Z" }], now)[0],
    ).not.toHaveProperty("override");
    expect(withOverrides("cus_b", factors, [override], now)[0]).not.toHaveProperty("override");
  });
});
