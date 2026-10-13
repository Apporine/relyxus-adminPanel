import { matchSearch, parseSearchQuery } from "@/domain/search";
import { getCurrentStaff, getSearchIndex, listLicenses } from "./index";

describe("data layer", () => {
  it("resolves the current staff user", async () => {
    expect((await getCurrentStaff()).name).toBe("Amara Okafor");
  });

  it("filters licenses by customer", async () => {
    const licenses = await listLicenses("cus_meridian");
    expect(licenses.map((l) => l.productId).sort()).toEqual(["prd_relyxus", "prd_sentinel"]);
  });

  it("search index finds a customer's records across object types", async () => {
    const index = await getSearchIndex();
    const types = new Set(matchSearch(index, parseSearchQuery("halden")).map((r) => r.type));
    expect(types).toEqual(new Set(["customer", "contact", "contract", "license", "deployment"]));
  });

  it("search supports structured filters from the spec examples", async () => {
    const index = await getSearchIndex();
    expect(matchSearch(index, parseSearchQuery("release:2.3.1")).map((r) => r.id)).toEqual([
      "rel_2_3_1",
    ]);
    expect(
      matchSearch(index, parseSearchQuery("deployment:prod customer")).every(
        (r) => r.type === "deployment",
      ),
    ).toBe(true);
  });
});
