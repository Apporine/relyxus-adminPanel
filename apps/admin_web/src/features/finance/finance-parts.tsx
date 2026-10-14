import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { SegmentNav } from "@/components/ui/segment-nav";
import { ContentSkeleton } from "@/components/ui/skeletons";
import { roundEstimate } from "@/domain/finance";
import { formatMoneyCompact, formatTimestamp } from "@/lib/format";
import type { FinanceData } from "./load";

export type AnalyticsArea =
  "reports" | "builder" | "views" | "schedules" | "finance" | "data-quality";

/** Areas of the Analytics module. */
export function AnalyticsNav({ current }: { current: AnalyticsArea }) {
  const items = [
    { id: "reports", href: "/analytics", label: "Report library" },
    { id: "builder", href: "/analytics/builder", label: "Report builder" },
    { id: "views", href: "/analytics/saved-views", label: "Saved views" },
    { id: "schedules", href: "/analytics/schedules", label: "Scheduled reports" },
    { id: "finance", href: "/analytics/finance", label: "Finance" },
    { id: "data-quality", href: "/analytics/data-quality", label: "Data quality" },
  ];
  return (
    <SegmentNav
      label="Analytics areas"
      items={items.map((i) => ({ href: i.href, label: i.label, current: i.id === current }))}
    />
  );
}

export type FinanceView = "summary" | "cost" | "margin" | "attribution";

export function FinanceNav({ current, query = "" }: { current: FinanceView; query?: string }) {
  const items = [
    { id: "summary", href: "/analytics/finance", label: "Commercial summary" },
    { id: "cost", href: `/analytics/finance/cost-to-serve${query}`, label: "Cost to serve" },
    { id: "margin", href: "/analytics/finance/margin", label: "Margin estimate" },
    { id: "attribution", href: "/analytics/finance/attribution", label: "Cost attribution" },
  ];
  return (
    <SegmentNav
      label="Finance views"
      items={items.map((i) => ({ href: i.href, label: i.label, current: i.id === current }))}
    />
  );
}

export function FinanceSkeleton() {
  return <ContentSkeleton label="analytics data" metrics={4} columns={6} />;
}

/** Finance and Executive roles only (spec §30); others see why, not a misleading zero. */
export function FinanceRestricted() {
  return (
    <Card aria-label="Finance restricted">
      <EmptyState
        icon={Lock}
        title="Restricted"
        body="Contract value, cost and margin need a finance, commercial or executive role."
      />
    </Card>
  );
}

const gbp = (minor: number) => ({ amountMinor: minor, currency: "GBP" as const });

/** Exact GBP from records, compact. */
export function gbpCompact(minor: number) {
  return formatMoneyCompact(gbp(minor));
}

/** Estimates are rounded to £1,000 and marked with ≈ (no false precision). */
export function gbpEstimate(minor: number) {
  const rounded = roundEstimate(minor);
  return `≈ ${formatMoneyCompact(gbp(Math.abs(rounded) < 100_000 ? 0 : rounded))}`;
}

/** Delayed or unavailable sources, stated with what is affected (spec §30 states). */
export function SourceNotices({ data, uses }: { data: FinanceData; uses: string[] }) {
  return (
    <>
      {data.sources
        .filter((s) => uses.includes(s.id) && s.state !== "current")
        .map((s) => (
          <Notice
            key={s.id}
            tone="risk"
            title={
              s.state === "delayed" ? `${s.name} delayed` : `${s.name} unavailable: ${s.system}`
            }
          >
            {s.state === "delayed"
              ? `Last import ${formatTimestamp(s.lastSyncedAt)} from ${s.system}. Figures use the last complete month.`
              : `Last sync ${formatTimestamp(s.lastSyncedAt)}. ${s.covers} are not shown; nothing else depends on them.`}
          </Notice>
        ))}
    </>
  );
}
