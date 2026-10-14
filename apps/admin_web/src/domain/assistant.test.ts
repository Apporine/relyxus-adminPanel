import { auditEvents } from "@/server/fixtures/audit";
import { contracts, deployments, licenses } from "@/server/fixtures/commercial";
import { customers } from "@/server/fixtures/customers";
import { fxRates } from "@/server/fixtures/finance";
import { approvals, supportCases } from "@/server/fixtures/operations";
import { releases } from "@/server/fixtures/staff";
import { riskRegister } from "@/server/fixtures/success";
import {
  auditTrailBrief,
  customerBrief,
  interpretQuestion,
  portfolioBrief,
  releaseImpactBrief,
  type AssistantContext,
} from "./assistant";

const ctx: AssistantContext = {
  now: "2026-10-13T09:00:00Z",
  fx: fxRates,
  canViewCommercial: true,
  customers,
  contracts,
  licenses,
  deployments,
  releases,
  approvals,
  cases: supportCases,
  risks: riskRegister,
};

describe("briefs", () => {
  it("links every portfolio line to its records", () => {
    const brief = portfolioBrief(ctx);
    expect(brief.lines).toHaveLength(5);
    expect(brief.lines.every((l) => l.href.startsWith("/"))).toBe(true);
    expect(brief.lines[0]!.text).toMatch(/^5 contracts renew in the next 90 days, worth £/);
  });

  it("omits contract value without commercial permission", () => {
    const restricted = portfolioBrief({ ...ctx, canViewCommercial: false });
    expect(restricted.lines[0]!.text).toBe("5 contracts renew in the next 90 days.");
    const halden = customers.find((c) => c.id === "cus_halden")!;
    expect(customerBrief(halden, { ...ctx, canViewCommercial: false }).lines[1]!.text).not.toMatch(
      /value/,
    );
  });

  it("summarises one customer from its records", () => {
    const halden = customers.find((c) => c.id === "cus_halden")!;
    const brief = customerBrief(halden, ctx);
    expect(brief.title).toBe("Halden Mutual brief");
    expect(brief.lines[0]!.text).toMatch(/^Health is at risk/);
    expect(brief.lines.map((l) => l.href)).toContain("/customers/cus_halden?tab=licenses");
  });

  it("explains release impact without scheduling anything", () => {
    const eos = releases.find((r) => r.version === "2.1.0")!;
    const brief = releaseImpactBrief(eos, ctx);
    expect(brief.lines[0]!.text).toBe("Support ended 30 Sept.");
    expect(brief.lines[2]!.text).toMatch(/nothing is scheduled automatically/);
  });

  it("tells an audit chain in order with links to each event", () => {
    const brief = auditTrailBrief(auditEvents, "cor_inc2307", (id) => id);
    expect(brief.lines).toHaveLength(6);
    expect(brief.lines[0]!.text).toMatch(/^07:31 UTC: stf_04 — requested break glass access/);
    expect(brief.lines.at(-1)!.href).toBe("/audit?event=aud_009126");
  });
});

describe("natural language search", () => {
  const names = customers.map((c) => ({ id: c.id, name: c.displayName }));

  it("turns questions into filter links", () => {
    expect(interpretQuestion("Which licenses are in grace?", names)?.href).toBe(
      "/licensing?state=grace",
    );
    expect(interpretQuestion("show denied actions", names)?.href).toBe("/audit?result=denied");
  });

  it("prefers the most specific customer name", () => {
    expect(interpretQuestion("tell me about Northwind Payments UK", names)?.href).toBe(
      "/customers/cus_northwind_uk",
    );
  });

  it("says when it cannot interpret a question", () => {
    expect(interpretQuestion("what is the weather", names)).toBeUndefined();
  });
});
