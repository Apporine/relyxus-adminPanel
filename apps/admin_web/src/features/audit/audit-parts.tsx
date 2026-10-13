import { FilterFrame } from "@/components/filters/filter-frame";
import { StatusBadge, type BadgeTone } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/feedback";
import { SegmentNav } from "@/components/ui/segment-nav";
import { auditCategoryLabel, auditFilterParams, type AuditFilters } from "@/domain/audit";
import type { AuditResult } from "@/domain/types";
import { loadAudit, type AuditData } from "./load";

export type AuditView = "log" | "analytics" | "exports";

/** Query string for the current filters, so switching views keeps them (spec §24.1). */
export function auditQuery(filters: AuditFilters, extra: Record<string, string> = {}) {
  const query = new URLSearchParams({ ...auditFilterParams(filters), ...extra }).toString();
  return query ? `?${query}` : "";
}

export function AuditNav({ current, filters }: { current: AuditView; filters?: AuditFilters }) {
  const query = filters ? auditQuery(filters) : "";
  const items = [
    { id: "log", href: `/audit${query}`, label: "Audit log" },
    { id: "analytics", href: `/audit/analytics${query}`, label: "Analytics" },
    { id: "exports", href: "/audit/exports", label: "Export center" },
  ];
  return (
    <SegmentNav
      label="Audit views"
      items={items.map((i) => ({ href: i.href, label: i.label, current: i.id === current }))}
    />
  );
}

export function AuditSkeleton() {
  return <Skeleton className="h-96 rounded-card" aria-busy="true" />;
}

const resultPresentation: Record<AuditResult, { label: string; tone: BadgeTone }> = {
  success: { label: "Success", tone: "healthy" },
  failure: { label: "Failed", tone: "risk" },
  denied: { label: "Denied", tone: "critical" },
};

export function ResultBadge({ result }: { result: AuditResult }) {
  const p = resultPresentation[result];
  return <StatusBadge tone={p.tone} label={p.label} />;
}

/** Filter bar shared by the log and analytics, so both always show the same events. */
export function AuditFilterBar({ data, children }: { data: AuditData; children: React.ReactNode }) {
  const values = auditFilterParams(data.filters);
  return (
    <FilterFrame
      label="Audit filters"
      search={{ name: "q", label: "Search", placeholder: "Object, request or correlation ID" }}
      values={{ ...values, range: data.filters.range }}
      filters={[
        {
          name: "range",
          label: "Time range",
          options: [
            { value: "24h", label: "Last 24 hours" },
            { value: "7d", label: "Last 7 days" },
            { value: "14d", label: "Last 14 days" },
          ],
        },
        {
          name: "category",
          label: "Area",
          allLabel: "All areas",
          options: Object.entries(auditCategoryLabel).map(([value, label]) => ({ value, label })),
        },
        {
          name: "result",
          label: "Result",
          allLabel: "All results",
          options: [
            { value: "success", label: "Success" },
            { value: "failure", label: "Failed" },
            { value: "denied", label: "Denied" },
          ],
        },
        {
          name: "actor",
          label: "Actor",
          allLabel: "All actors",
          options: data.actors.map((id) => ({ value: id, label: data.actorName(id) })),
        },
        {
          name: "customer",
          label: "Customer",
          allLabel: "All customers",
          options: data.customers.map((c) => ({ value: c.id, label: c.displayName })),
        },
        {
          name: "product",
          label: "Product",
          allLabel: "All products",
          options: data.products.map((p) => ({ value: p.id, label: p.name })),
        },
        {
          name: "impact",
          label: "Impact",
          allLabel: "Any impact",
          options: [{ value: "high", label: "High impact only" }],
        },
        {
          name: "source",
          label: "Source",
          allLabel: "All sources",
          options: [
            { value: "web", label: "Web" },
            { value: "api", label: "API" },
            { value: "automation", label: "Automation" },
          ],
        },
      ]}
    >
      {children}
    </FilterFrame>
  );
}

/** View navigation that carries the current filters between the log and analytics. */
export async function AuditNavWithFilters({
  current,
  searchParams,
}: {
  current: AuditView;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await loadAudit(await searchParams);
  return <AuditNav current={current} filters={data.filters} />;
}
