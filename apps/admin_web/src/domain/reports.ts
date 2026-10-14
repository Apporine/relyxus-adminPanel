import type { DatasetKey, ReportDefinition, ReportFamily, ReportFilter, RoleKey } from "./types";

/**
 * Report engine (spec §26). Reports use approved fields only, and fields a role may not
 * see are removed before rows leave the server, so the browser never holds them.
 */

export type FieldPermission = "commercial" | "security";

export interface DatasetField {
  key: string;
  label: string;
  type: "text" | "number" | "date";
  classification: "Internal" | "Confidential" | "Restricted";
  requires?: FieldPermission;
}

export type ReportValue = string | number;
export type ReportRow = Record<string, ReportValue>;

export interface Dataset {
  key: DatasetKey;
  label: string;
  description: string;
  fields: DatasetField[];
  rows: ReportRow[];
}

export const reportFamilyLabel: Record<ReportFamily, string> = {
  portfolio: "Portfolio",
  commercial: "Commercial",
  licensing: "Licensing",
  deployment: "Deployment",
  success: "Customer success",
  support: "Support",
  finance: "Finance",
  security: "Security",
  audit: "Audit",
};

const commercialReaders: RoleKey[] = [
  "commercial_operations",
  "finance_viewer",
  "executive_viewer",
  "portfolio_admin",
];
const securityReaders: RoleKey[] = ["security_admin", "auditor"];

/** Field permissions a staff member holds. */
export function fieldPermissions(roles: RoleKey[]): Set<FieldPermission> {
  const granted = new Set<FieldPermission>();
  if (roles.some((r) => commercialReaders.includes(r))) granted.add("commercial");
  if (roles.some((r) => securityReaders.includes(r))) granted.add("security");
  return granted;
}

export function canSeeField(field: DatasetField, granted: Set<FieldPermission>) {
  return !field.requires || granted.has(field.requires);
}

/** Removes fields the viewer may not see from both the definitions and every row. */
export function restrictDataset(dataset: Dataset, granted: Set<FieldPermission>) {
  const visible = dataset.fields.filter((f) => canSeeField(f, granted));
  // Each visible field keeps its sort companion; hidden fields lose both.
  const keys = visible.flatMap((f) => [f.key, `${f.key}__sort`]);
  return {
    ...dataset,
    fields: visible,
    locked: dataset.fields.filter((f) => !canSeeField(f, granted)),
    rows: dataset.rows.map((row) =>
      Object.fromEntries(keys.filter((k) => k in row).map((k) => [k, row[k]!])),
    ),
  };
}

export type RestrictedDataset = ReturnType<typeof restrictDataset>;

export interface ReportQuery {
  columns: string[];
  filter?: ReportFilter;
  sort?: { field: string; direction: "ascending" | "descending" };
}

/** Runs a query: exact or "contains" filter, typed sort, visible columns only. */
export function runReport(dataset: RestrictedDataset, query: ReportQuery) {
  const fieldByKey = new Map(dataset.fields.map((f) => [f.key, f]));
  const columns = query.columns.filter((c) => fieldByKey.has(c));
  const hidden = query.columns.filter((c) => !fieldByKey.has(c));
  let rows = dataset.rows;
  const filter = query.filter;
  if (filter && fieldByKey.has(filter.field)) {
    const text = (r: ReportRow) => String(r[filter.field] ?? "").toLowerCase();
    if ("anyOf" in filter) {
      const wanted = new Set(filter.anyOf.map((v) => v.toLowerCase()));
      rows = rows.filter((r) => wanted.has(text(r)));
    } else if (filter.contains.trim()) {
      const needle = filter.contains.trim().toLowerCase();
      rows = rows.filter((r) => text(r).includes(needle));
    }
  }
  const sort = query.sort;
  if (sort && fieldByKey.has(sort.field)) {
    const sign = sort.direction === "ascending" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const key = `${sort.field}__sort` in a ? `${sort.field}__sort` : sort.field;
      const x = a[key] ?? "";
      const y = b[key] ?? "";
      // Empty values sort last in either direction.
      if (x === "" || y === "") return x === y ? 0 : x === "" ? 1 : -1;
      return typeof x === "number" && typeof y === "number"
        ? sign * (x - y)
        : sign * String(x).localeCompare(String(y));
    });
  }
  return {
    columns: columns.map((c) => fieldByKey.get(c)!),
    hidden,
    rows,
  };
}

export function reportQuery(report: ReportDefinition): ReportQuery {
  return { columns: report.columns, filter: report.filter, sort: report.sort };
}
