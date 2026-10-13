import { matchSearch, parseSearchQuery } from "@/domain/search";
import {
  getApproval,
  getCurrentStaff,
  getCustomer,
  getEnvironment,
  getLicense,
  getReferenceTime,
  getSearchIndex,
  getStaffDirectory,
  listApprovals,
  listAuditEvents,
  listContacts,
  listContracts,
  listCostSnapshots,
  listCustomers,
  listDeployments,
  listHealthHistory,
  listLicenses,
  listProducts,
  listReleases,
  listStaff,
  listTasks,
} from "./index";

describe("session", () => {
  it("resolves the current staff user, environment and reference time", async () => {
    expect((await getCurrentStaff()).name).toBe("Amara Okafor");
    expect(await getEnvironment()).toBe("DEVELOPMENT");
    expect(await getReferenceTime()).toBe("2026-10-13T09:00:00Z");
  });

  it("indexes staff by ID", async () => {
    const [staff, directory] = await Promise.all([listStaff(), getStaffDirectory()]);
    expect(Object.keys(directory)).toHaveLength(staff.length);
    expect(directory.stf_05?.title).toBe("Licensing Approver");
  });
});

describe("records", () => {
  it("returns all records or those for one customer", async () => {
    const customerScoped = [
      [await listContacts(), await listContacts("cus_northwind")],
      [await listContracts(), await listContracts("cus_northwind")],
      [await listLicenses(), await listLicenses("cus_northwind")],
      [await listDeployments(), await listDeployments("cus_northwind")],
      [await listAuditEvents(), await listAuditEvents("cus_northwind")],
    ] as const;
    for (const [all, scoped] of customerScoped) {
      expect(scoped.length).toBeGreaterThan(0);
      expect(scoped.length).toBeLessThan(all.length);
      expect(scoped.every((r) => r.customerId === "cus_northwind")).toBe(true);
    }
  });

  it("finds single records and returns undefined for unknown IDs", async () => {
    expect((await getCustomer("cus_halden"))?.displayName).toBe("Halden Mutual");
    expect(await getCustomer("cus_missing")).toBeUndefined();
    expect((await getLicense("LIC_00391"))?.customerId).toBe("cus_halden");
    expect(await getLicense("LIC_missing")).toBeUndefined();
    expect((await getApproval("apr_1043"))?.highImpact).toBe(true);
    expect(await getApproval("apr_missing")).toBeUndefined();
  });

  it("filters licenses by customer across products", async () => {
    const licenses = await listLicenses("cus_meridian");
    expect(licenses.map((l) => l.productId).sort()).toEqual(["prd_relyxus", "prd_sentinel"]);
  });

  it("lists products, releases and operational data", async () => {
    expect(await listProducts()).toHaveLength(2);
    expect((await listReleases("prd_sentinel")).map((r) => r.version)).toEqual(["0.9.2"]);
    expect((await listReleases()).length).toBeGreaterThan(1);
    expect((await listCustomers()).length).toBeGreaterThan(10);
    expect((await listApprovals()).some((a) => a.state === "pending")).toBe(true);
    expect((await listTasks()).length).toBeGreaterThan(0);
    expect((await listCostSnapshots()).length).toBeGreaterThan(0);
    expect((await listHealthHistory()).length).toBe(6);
  });
});

describe("search index", () => {
  it("finds a customer's records across object types", async () => {
    const index = await getSearchIndex();
    const types = new Set(matchSearch(index, parseSearchQuery("halden")).map((r) => r.type));
    expect(types).toEqual(new Set(["customer", "contact", "contract", "license", "deployment"]));
  });

  it("supports structured filters from the spec examples", async () => {
    const index = await getSearchIndex();
    expect(matchSearch(index, parseSearchQuery("release:2.3.1")).map((r) => r.id)).toEqual([
      "rel_2_3_1",
    ]);
    expect(
      matchSearch(index, parseSearchQuery("product:sentinel")).some((r) => r.type === "product"),
    ).toBe(true);
    expect(
      matchSearch(index, parseSearchQuery("deployment:prod customer")).every(
        (r) => r.type === "deployment",
      ),
    ).toBe(true);
  });
});
