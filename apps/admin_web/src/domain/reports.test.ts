import { fieldPermissions, restrictDataset, runReport, type Dataset } from "./reports";

const dataset: Dataset = {
  key: "customers",
  label: "Customers",
  description: "",
  fields: [
    { key: "name", label: "Customer", type: "text", classification: "Internal" },
    { key: "health", label: "Health", type: "text", classification: "Internal" },
    {
      key: "acv",
      label: "ACV",
      type: "text",
      classification: "Restricted",
      requires: "commercial",
    },
  ],
  rows: [
    { name: "Beta", health: "At risk", acv: "€100,000", acv__sort: 8_600_000 },
    { name: "Alpha", health: "Healthy", acv: "£90,000", acv__sort: 9_000_000 },
    { name: "Gamma", health: "Critical", acv: "", acv__sort: "" },
  ],
};

describe("field permissions", () => {
  it("grants commercial and security fields by role", () => {
    expect([...fieldPermissions(["finance_viewer"])]).toEqual(["commercial"]);
    expect([...fieldPermissions(["auditor"])]).toEqual(["security"]);
    expect(fieldPermissions(["support_engineer"]).size).toBe(0);
  });

  it("removes restricted fields and their sort values from rows", () => {
    const restricted = restrictDataset(dataset, new Set());
    expect(restricted.fields.map((f) => f.key)).toEqual(["name", "health"]);
    expect(restricted.locked.map((f) => f.key)).toEqual(["acv"]);
    expect(restricted.rows[0]).toEqual({ name: "Beta", health: "At risk" });
  });
});

describe("runReport", () => {
  const full = restrictDataset(dataset, new Set(["commercial"]));

  it("filters by exact values or contained text", () => {
    const anyOf = runReport(full, {
      columns: ["name"],
      filter: { field: "health", anyOf: ["at risk", "Critical"] },
    });
    expect(anyOf.rows.map((r) => r.name)).toEqual(["Beta", "Gamma"]);
    const contains = runReport(full, {
      columns: ["name"],
      filter: { field: "name", contains: "ph" },
    });
    expect(contains.rows.map((r) => r.name)).toEqual(["Alpha"]);
  });

  it("sorts money by its GBP companion and keeps empty values last", () => {
    const sorted = runReport(full, {
      columns: ["name", "acv"],
      sort: { field: "acv", direction: "descending" },
    });
    expect(sorted.rows.map((r) => r.name)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("reports columns the viewer cannot see", () => {
    const limited = restrictDataset(dataset, new Set());
    const result = runReport(limited, { columns: ["name", "acv"] });
    expect(result.columns.map((c) => c.key)).toEqual(["name"]);
    expect(result.hidden).toEqual(["acv"]);
  });
});
