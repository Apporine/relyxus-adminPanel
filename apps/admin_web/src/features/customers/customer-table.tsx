"use client";

import { Columns3, Copy, ListFilter, Rows3, Rows4, SearchX, X } from "lucide-react";
import Link from "next/link";
import { Popover } from "radix-ui";
import { useEffect, useMemo, useState } from "react";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/field";
import {
  SortableHeaderCell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type SortDirection,
} from "@/components/ui/table";
import {
  emptyCustomerFilters,
  filterCustomerRows,
  savedViews,
  sortCustomerRows,
  type CustomerFilters,
  type CustomerRow,
  type CustomerSortKey,
} from "@/domain/customers";
import { healthStatuses, lifecycleStages, regions } from "@/domain/portfolio";
import { healthStatus, licenseState, lifecycleStage } from "@/domain/status";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/use-hydrated";
import {
  formatDate,
  formatMoneyCompact,
  formatRelativeDays,
  formatRelativeTime,
} from "@/lib/format";

type ColumnKey =
  | "products"
  | "lifecycle"
  | "health"
  | "renewal"
  | "value"
  | "owners"
  | "license"
  | "deployments"
  | "activity";

const columnLabels: Record<ColumnKey, string> = {
  products: "Products",
  lifecycle: "Lifecycle",
  health: "Health",
  renewal: "Renewal",
  value: "Contract value",
  owners: "Owners",
  license: "License",
  deployments: "Deployments",
  activity: "Last activity",
};

const sortableColumns: Partial<Record<ColumnKey, CustomerSortKey>> = {
  health: "health",
  renewal: "renewal",
  value: "value",
  deployments: "deployments",
  activity: "activity",
};

interface Option {
  value: string;
  label: string;
}

/** Writes filters to the URL without a server round trip, so the view stays shareable. */
function syncUrl(filters: CustomerFilters, viewId: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, String(value));
  if (viewId !== "custom" && viewId !== "all") params.set("view", viewId);
  const query = params.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

function sameFilters(a: CustomerFilters, b: CustomerFilters): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof CustomerFilters>;
  return [...keys].every((key) => (a[key] || undefined) === (b[key] || undefined));
}

/**
 * Customer list (spec §30.1): dense table, filter rail, saved views, column manager,
 * density control and bulk selection limited to safe actions.
 */
export function CustomerTable({
  rows,
  ownerNames,
  productOptions,
  ownerOptions,
  canViewCommercial,
  initialFilters,
  now,
}: {
  rows: CustomerRow[];
  ownerNames: Record<string, string>;
  productOptions: Option[];
  ownerOptions: Option[];
  canViewCommercial: boolean;
  initialFilters: CustomerFilters;
  now: string;
}) {
  const [filters, setFilters] = useState<CustomerFilters>(initialFilters);
  const [sort, setSort] = useState<{
    key: CustomerSortKey;
    direction: Exclude<SortDirection, "none">;
  }>({
    key: "health",
    direction: "ascending",
  });
  const [hidden, setHidden] = useState<Set<ColumnKey>>(new Set());
  const [compact, setCompact] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const hydrated = useHydrated();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const viewId = savedViews.find((v) => sameFilters(v.filters, filters))?.id ?? "custom";

  useEffect(() => {
    syncUrl(filters, viewId);
  }, [filters, viewId]);

  const visibleRows = useMemo(
    () => sortCustomerRows(filterCustomerRows(rows, filters, ownerNames), sort.key, sort.direction),
    [rows, filters, ownerNames, sort],
  );

  const columns = (Object.keys(columnLabels) as ColumnKey[]).filter(
    (key) => !hidden.has(key) && (key !== "value" || canViewCommercial),
  );
  const selectedVisible = visibleRows.filter((r) => selected.has(r.id));
  const allSelected = visibleRows.length > 0 && selectedVisible.length === visibleRows.length;

  function update(patch: Partial<CustomerFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function toggleSort(key: CustomerSortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "ascending" ? "descending" : "ascending" }
        : { key, direction: "ascending" },
    );
  }

  function toggleRow(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const rail: Array<{ key: keyof CustomerFilters; label: string; all: string; options: Option[] }> =
    [
      {
        key: "health",
        label: "Health",
        all: "Any health",
        options: healthStatuses.map((h) => ({ value: h, label: healthStatus[h].label })),
      },
      {
        key: "stage",
        label: "Lifecycle stage",
        all: "All stages",
        options: lifecycleStages.map((s) => ({ value: s, label: lifecycleStage[s] })),
      },
      {
        key: "region",
        label: "Region",
        all: "All regions",
        options: regions.map((r) => ({ value: r, label: r })),
      },
      { key: "product", label: "Product", all: "All products", options: productOptions },
      { key: "owner", label: "Owner", all: "Any owner", options: ownerOptions },
      {
        key: "renewal",
        label: "Renewal",
        all: "Any date",
        options: [30, 60, 90, 120].map((d) => ({ value: String(d), label: `Within ${d} days` })),
      },
      {
        key: "status",
        label: "Account status",
        all: "Any status",
        options: [
          { value: "active", label: "Active" },
          { value: "onboarding", label: "Onboarding" },
          { value: "suspended", label: "Suspended" },
          { value: "churned", label: "Churned" },
        ],
      },
    ];

  const filtered = !sameFilters(filters, emptyCustomerFilters);

  return (
    <div
      data-hydrated={hydrated}
      className={cn("grid gap-6", railOpen && "lg:grid-cols-[14rem_minmax(0,1fr)]")}
    >
      <aside
        id="customer-filters"
        aria-label="Customer filters"
        hidden={!railOpen}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <p className="text-micro font-semibold text-fg-muted">Saved views</p>
          <ul className="flex flex-col">
            {savedViews.map((view) => (
              <li key={view.id}>
                <button
                  type="button"
                  aria-pressed={viewId === view.id}
                  onClick={() => setFilters(view.filters)}
                  className={cn(
                    "flex h-8 w-full items-center justify-between rounded-control px-2.5 text-dense text-fg-secondary hover:bg-surface-hover hover:text-fg",
                    "aria-pressed:bg-surface-selected aria-pressed:font-medium aria-pressed:text-fg",
                  )}
                >
                  {view.label}
                  {view.scope === "private" ? (
                    <span className="text-micro text-fg-muted">Private</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          {rail.map((item) => (
            <div key={item.key} className="flex flex-col gap-1">
              <label
                htmlFor={`customer-filter-${item.key}`}
                className="text-micro font-medium text-fg-muted"
              >
                {item.label}
              </label>
              <Select
                id={`customer-filter-${item.key}`}
                value={filters[item.key] === undefined ? "" : String(filters[item.key])}
                onChange={(event) =>
                  update({
                    [item.key]:
                      event.target.value === ""
                        ? undefined
                        : item.key === "renewal"
                          ? Number(event.target.value)
                          : event.target.value,
                  })
                }
                className="h-8 text-dense"
              >
                <option value="">{item.all}</option>
                {item.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
          {filtered ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFilters(emptyCustomerFilters)}
              className="self-start"
            >
              <X aria-hidden="true" />
              Clear filters
            </Button>
          ) : null}
        </div>
      </aside>

      <section
        aria-label="Customer results"
        className="min-w-0 rounded-card border border-border bg-surface shadow-card"
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <label className="flex min-w-60 flex-1 items-center gap-2">
            <span className="sr-only">Find customers</span>
            <Input
              type="search"
              value={filters.q}
              onChange={(event) => update({ q: event.target.value })}
              placeholder="Find by name, ID, owner, product or region"
              className="h-8 text-dense"
            />
          </label>
          <p aria-live="polite" className="px-1 text-dense text-fg-muted tabular">
            {visibleRows.length} of {rows.length} customers
          </p>
          <div className="ms-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              aria-expanded={railOpen}
              aria-controls="customer-filters"
              onClick={() => setRailOpen((open) => !open)}
            >
              <ListFilter aria-hidden="true" />
              {railOpen ? "Hide filters" : "Show filters"}
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={compact ? "Comfortable rows" : "Compact rows"}
              aria-pressed={compact}
              onClick={() => setCompact((c) => !c)}
            >
              {compact ? <Rows3 aria-hidden="true" /> : <Rows4 aria-hidden="true" />}
            </Button>
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button size="sm" variant="ghost">
                  <Columns3 aria-hidden="true" />
                  Columns
                </Button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="end"
                  sideOffset={6}
                  className="z-(--z-toast) w-56 rounded-card border border-border bg-surface p-2 shadow-overlay"
                >
                  <fieldset>
                    <legend className="px-2 pb-1.5 text-micro font-semibold text-fg-muted">
                      Visible columns
                    </legend>
                    {(Object.keys(columnLabels) as ColumnKey[])
                      .filter((key) => key !== "value" || canViewCommercial)
                      .map((key) => (
                        <label
                          key={key}
                          className="flex h-8 items-center gap-2 rounded-control px-2 text-dense text-fg hover:bg-surface-hover"
                        >
                          <input
                            type="checkbox"
                            checked={!hidden.has(key)}
                            onChange={() =>
                              setHidden((current) => {
                                const next = new Set(current);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                              })
                            }
                            className="size-4 accent-violet"
                          />
                          {columnLabels[key]}
                        </label>
                      ))}
                  </fieldset>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>

        {selectedVisible.length > 0 ? (
          <div
            role="region"
            aria-label="Bulk actions"
            className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-selected px-3 py-2"
          >
            <p className="text-dense font-medium text-fg">{selectedVisible.length} selected</p>
            {/* Only safe bulk actions: nothing here changes commercial or licensing state. */}
            <DesignPreviewDialog
              trigger="Create task"
              title="Create task"
              description={`Create one task for each of the ${selectedVisible.length} selected customers.`}
              confirmLabel="Create tasks"
            />
            <DesignPreviewDialog
              trigger="Export selected"
              title="Export customers"
              description="The export contains only fields you are authorized to view. The export event is recorded in audit."
              confirmLabel="Start export"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              className="ms-auto"
            >
              Clear selection
            </Button>
          </div>
        ) : null}

        {visibleRows.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No customers match this view"
            body="Change the search or filters. Customers outside your scope are not listed."
            action={
              <Button variant="link" onClick={() => setFilters(emptyCustomerFilters)}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div data-density={compact ? "compact" : undefined}>
            <Table label="Customers">
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="w-10 pe-0">
                    <input
                      type="checkbox"
                      aria-label="Select all customers in this view"
                      checked={allSelected}
                      onChange={() =>
                        setSelected(allSelected ? new Set() : new Set(visibleRows.map((r) => r.id)))
                      }
                      className="size-4 accent-violet"
                    />
                  </TableHeaderCell>
                  <SortableHeaderCell
                    direction={sort.key === "name" ? sort.direction : "none"}
                    onSort={() => toggleSort("name")}
                  >
                    Customer
                  </SortableHeaderCell>
                  {columns.map((key) => {
                    const sortKey = sortableColumns[key];
                    return sortKey ? (
                      <SortableHeaderCell
                        key={key}
                        direction={sort.key === sortKey ? sort.direction : "none"}
                        onSort={() => toggleSort(sortKey)}
                      >
                        {columnLabels[key]}
                      </SortableHeaderCell>
                    ) : (
                      <TableHeaderCell key={key}>{columnLabels[key]}</TableHeaderCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map((row) => (
                  <TableRow key={row.id} data-state={selected.has(row.id) ? "selected" : undefined}>
                    <TableCell className="pe-0">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.name}`}
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="size-4 accent-violet"
                      />
                    </TableCell>
                    <TableCell className="min-w-48">
                      <Link
                        href={`/customers/${row.id}`}
                        className="font-medium text-fg hover:text-violet-text hover:underline"
                      >
                        {row.name}
                      </Link>
                      <span className="flex items-center gap-1.5">
                        <code className="font-mono text-micro text-fg-muted">{row.id}</code>
                        {row.duplicateOfId ? (
                          <StatusBadge
                            tone="risk"
                            icon={Copy}
                            label="Possible duplicate"
                            className="h-5"
                          />
                        ) : null}
                      </span>
                    </TableCell>
                    {columns.map((key) => (
                      <TableCell key={key} className="whitespace-nowrap">
                        <Cell column={key} row={row} ownerNames={ownerNames} now={now} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

function Cell({
  column,
  row,
  ownerNames,
  now,
}: {
  column: ColumnKey;
  row: CustomerRow;
  ownerNames: Record<string, string>;
  now: string;
}) {
  switch (column) {
    case "products":
      return (
        <span className="flex gap-1">
          {row.productCodes.map((code) => (
            <Tag key={code}>{code}</Tag>
          ))}
        </span>
      );
    case "lifecycle":
      return lifecycleStage[row.lifecycleStage];
    case "health":
      return (
        <StatusBadge tone={healthStatus[row.health].tone} label={healthStatus[row.health].label} />
      );
    case "renewal":
      return row.renewalAt && row.renewalDays !== undefined ? (
        <span className="flex flex-col">
          <span className="text-fg">{formatDate(row.renewalAt)}</span>
          <span
            className={cn(
              "text-micro",
              row.renewalDays <= 30 ? "font-medium text-coral-text" : "text-fg-muted",
            )}
          >
            {formatRelativeDays(row.renewalAt, now)}
          </span>
        </span>
      ) : (
        <span className="text-fg-muted">No contract</span>
      );
    case "value":
      return row.annualContractValue ? (
        <span className="text-fg">{formatMoneyCompact(row.annualContractValue)}</span>
      ) : (
        <span className="text-fg-muted">—</span>
      );
    case "owners":
      return (
        <span className="flex flex-col text-micro">
          <span className="text-fg-secondary">
            {row.commercialOwnerId ? ownerNames[row.commercialOwnerId] : "No commercial owner"}
          </span>
          <span className={row.successOwnerId ? "text-fg-muted" : "font-medium text-coral-text"}>
            {row.successOwnerId ? ownerNames[row.successOwnerId] : "No success owner"}
          </span>
        </span>
      );
    case "license":
      return row.licenseState ? (
        <StatusBadge
          tone={licenseState[row.licenseState].tone}
          label={licenseState[row.licenseState].label}
        />
      ) : (
        <span className="text-fg-muted">None issued</span>
      );
    case "deployments":
      return <span className="tabular">{row.deploymentCount}</span>;
    case "activity":
      return (
        <time dateTime={row.lastActivityAt} title={row.lastActivityAt} className="text-fg-muted">
          {formatRelativeTime(row.lastActivityAt, now)}
        </time>
      );
  }
}
