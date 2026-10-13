import { matchSearch, parseSearchQuery, type SearchResult } from "./search";

describe("parseSearchQuery", () => {
  it("keeps plain text as free text", () => {
    expect(parseSearchQuery("  Acme   Bank ")).toEqual({ text: "Acme Bank", filters: {} });
  });

  it("extracts structured filters and leaves remaining text", () => {
    expect(parseSearchQuery("product:relyxus status:active halden")).toEqual({
      text: "halden",
      filters: { product: "relyxus", status: "active" },
    });
  });

  it("supports quoted values and case-insensitive keys", () => {
    expect(parseSearchQuery('Customer:"Northwind Payments" release:2.3.1')).toEqual({
      text: "",
      filters: { customer: "Northwind Payments", release: "2.3.1" },
    });
  });

  it("parses email-like contact filters", () => {
    expect(parseSearchQuery("contact:security@example.com").filters.contact).toBe(
      "security@example.com",
    );
  });
});

const index: SearchResult[] = [
  {
    type: "customer",
    id: "cus_halden",
    title: "Halden Mutual",
    subtitle: "",
    href: "",
    keywords: ["Halden Mutual Building Society"],
    status: "At risk",
    productCode: "RELYXUS",
  },
  {
    type: "customer",
    id: "cus_northwind",
    title: "Northwind Payments",
    subtitle: "",
    href: "",
    keywords: [],
    status: "Healthy",
    productCode: "RELYXUS",
  },
  {
    type: "license",
    id: "LIC_00391",
    title: "LIC_00391",
    subtitle: "",
    href: "",
    keywords: ["Halden Mutual"],
    status: "Active",
    productCode: "RELYXUS",
  },
  {
    type: "deployment",
    id: "dep_halden_production",
    title: "halden-relyxus-prod",
    subtitle: "",
    href: "",
    keywords: ["production", "Halden Mutual"],
    status: "Review needed",
    productCode: "RELYXUS",
  },
];

describe("matchSearch", () => {
  it("returns nothing for an empty query", () => {
    expect(matchSearch(index, parseSearchQuery(""))).toEqual([]);
  });

  it("matches free text across titles and keywords of every type", () => {
    expect(matchSearch(index, parseSearchQuery("halden")).map((r) => r.id)).toEqual([
      "cus_halden",
      "LIC_00391",
      "dep_halden_production",
    ]);
  });

  it("restricts to a type and matches the filter value by ID", () => {
    expect(matchSearch(index, parseSearchQuery("license:lic_00391")).map((r) => r.id)).toEqual([
      "LIC_00391",
    ]);
  });

  it("combines type filters with keyword matching", () => {
    expect(matchSearch(index, parseSearchQuery("deployment:prod")).map((r) => r.id)).toEqual([
      "dep_halden_production",
    ]);
  });

  it("filters by status", () => {
    expect(matchSearch(index, parseSearchQuery("status:healthy")).map((r) => r.id)).toEqual([
      "cus_northwind",
    ]);
  });
});
