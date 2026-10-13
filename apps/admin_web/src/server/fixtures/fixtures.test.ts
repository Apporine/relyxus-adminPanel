import { canonicalPayload, hashPayload } from "@/domain/artifact";
import { verifyAuditChain } from "@/domain/audit";
import { auditDaily, auditEvents } from "./audit";
import { approvals, healthHistory, tasks } from "./operations";
import { contracts, deployments, licenses } from "./commercial";
import { contacts, customers } from "./customers";
import { apiClients } from "./security";
import { products, releases, REFERENCE_NOW, staff } from "./staff";

const ids = <T extends { id: string }>(items: T[]) => new Set(items.map((i) => i.id));
const staffIds = ids(staff);
const customerIds = ids(customers);
const productIds = ids(products);
const licenseIds = ids(licenses);

describe("fixture integrity", () => {
  it.each([
    ["customers", customers],
    ["contacts", contacts],
    ["contracts", contracts],
    ["licenses", licenses],
    ["deployments", deployments],
    ["approvals", approvals],
    ["audit events", auditEvents],
    ["tasks", tasks],
  ])("%s have unique IDs", (_, items) => {
    expect(ids(items as Array<{ id: string }>).size).toBe(items.length);
  });

  it("customers reference known staff, products and parents", () => {
    for (const c of customers) {
      for (const owner of Object.values(c.owners)) expect(staffIds).toContain(owner);
      for (const p of c.productIds) expect(productIds).toContain(p);
      if (c.parentId) expect(customerIds).toContain(c.parentId);
    }
  });

  it("licenses, deployments and contracts reference known records", () => {
    for (const l of licenses) expect(customerIds).toContain(l.customerId);
    for (const d of deployments) {
      expect(customerIds).toContain(d.customerId);
      if (d.licenseId) expect(licenseIds).toContain(d.licenseId);
      expect(releases.map((r) => r.version)).toContain(d.releaseVersion);
    }
    for (const c of contracts) expect(customerIds).toContain(c.customerId);
  });

  it("approvals target known licenses and staff", () => {
    for (const a of approvals) {
      expect(staffIds).toContain(a.requesterId);
      for (const id of a.approverIds) expect(staffIds).toContain(id);
      if (a.targetType === "license" && a.state === "pending")
        expect(licenseIds).toContain(a.targetId);
      if (a.customerId) expect(customerIds).toContain(a.customerId);
    }
  });

  it("segregation of duties: requesters are excluded from approving their own requests", () => {
    for (const a of approvals) {
      expect(a.excludedApproverIds).toContain(a.requesterId);
      expect(a.approverIds).not.toContain(a.requesterId);
      if (a.decidedById) expect(a.decidedById).not.toBe(a.requesterId);
    }
  });

  it("the latest health snapshot matches current customer health", () => {
    const latest = healthHistory.at(-1)!;
    const count = (h: string) => customers.filter((c) => c.health === h).length;
    expect(latest).toMatchObject({
      healthy: count("healthy"),
      watch: count("watch"),
      atRisk: count("at_risk"),
      critical: count("critical"),
    });
  });

  it("tasks and audit events reference known actors and customers", () => {
    for (const t of tasks) {
      expect(staffIds).toContain(t.ownerId);
      if (t.customerId) expect(customerIds).toContain(t.customerId);
    }
    const clientIds = ids(apiClients);
    for (const e of auditEvents) {
      if (e.actorType === "api_client") expect(clientIds).toContain(e.actorId);
      else if (e.actorType !== "system") expect(staffIds).toContain(e.actorId);
      if (e.customerId) expect(customerIds).toContain(e.customerId);
      if (e.approvalId) expect(ids(approvals)).toContain(e.approvalId);
    }
  });

  it("keeps the audit log consistent: unique, hash chained, matching daily totals", () => {
    expect(ids(auditEvents).size).toBe(auditEvents.length);
    expect(verifyAuditChain(auditEvents)).toMatchObject({ intact: true });
    const total = auditDaily.reduce((sum, d) => sum + d.actions, 0);
    expect(total).toBe(auditEvents.length);
    expect(auditEvents.every((e) => e.at <= REFERENCE_NOW)).toBe(true);
  });

  it("logs each staff member's last sign in and nothing after it", () => {
    for (const person of staff) {
      const signIns = auditEvents.filter(
        (e) => e.actorId === person.id && e.action === "staff.sign_in" && e.result === "success",
      );
      for (const e of signIns) expect(e.at <= person.lastSignInAt).toBe(true);
      if (person.lastSignInAt >= "2026-09-30") {
        expect(signIns.some((e) => e.at === person.lastSignInAt)).toBe(true);
      }
    }
  });

  it("records the real payload hash for every license revision", async () => {
    for (const license of licenses) {
      for (const revision of license.revisions) {
        expect(revision.payloadHash).toBe(await hashPayload(canonicalPayload(license, revision)));
      }
    }
  });
});
