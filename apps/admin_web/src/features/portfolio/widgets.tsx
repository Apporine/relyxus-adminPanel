import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarClock,
  CircleCheck,
  CircleDashed,
  KeyRound,
  OctagonAlert,
  Server,
  Stamp,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ChartTable } from "@/components/charts/chart-table";
import { LineChart } from "@/components/charts/line-chart";
import { BarList, SegmentedBar, Sparkline } from "@/components/charts/simple-charts";
import { StackedColumns } from "@/components/charts/stacked-columns";
import { StatusBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { MetricCard } from "@/components/ui/metric-card";
import type { PortfolioSummary } from "@/domain/portfolio";
import { healthStatus, priority as priorityPresentation, releaseStatus } from "@/domain/status";
import type { HealthSnapshot, HealthStatus, Money, Product, StaffUser } from "@/domain/types";
import {
  formatDate,
  formatMoneyCompact,
  formatMoneyList,
  formatNumber,
  formatPercent,
  formatRelativeDays,
  daysUntil,
  plural,
} from "@/lib/format";

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

export const healthColor: Record<HealthStatus, string> = {
  healthy: "var(--ap-chart-healthy)",
  watch: "var(--ap-chart-neutral)",
  at_risk: "var(--ap-chart-risk)",
  critical: "var(--ap-chart-critical)",
};

const healthIcon: Record<HealthStatus, LucideIcon> = {
  healthy: CircleCheck,
  watch: CircleDashed,
  at_risk: TriangleAlert,
  critical: OctagonAlert,
};

/** Headline for per-currency values: the largest currency, with the rest named, never converted. */
function moneyHeadline(values: Money[]) {
  const [first, ...rest] = values;
  return {
    value: first ? formatMoneyCompact(first) : "—",
    detail: rest.length
      ? `+ ${rest.map(formatMoneyCompact).join(" · ")} · not FX converted`
      : "Single currency",
  };
}

// Summary row --------------------------------------------------------------------------------

const renewalShades = [
  "var(--ap-chart-primary-strong)",
  "var(--ap-chart-primary)",
  "var(--ap-chart-primary-2)",
  "var(--ap-chart-primary-3)",
];

export function SummaryMetrics({
  summary,
  licenseRiskTrend,
  financeScope,
}: {
  summary: PortfolioSummary;
  licenseRiskTrend: number[];
  financeScope: boolean;
}) {
  const acv = moneyHeadline(summary.annualContractValue);
  const risk = summary.licenseRisk;
  const riskParts = [
    risk.expiring && `${risk.expiring} expiring`,
    risk.grace && `${risk.grace} in grace`,
    risk.suspended && `${risk.suspended} suspended`,
    risk.verificationFailed && `${risk.verificationFailed} failed verification`,
    risk.drift && `${risk.drift} entitlement drift`,
  ].filter(Boolean);

  return (
    <section
      aria-label="Portfolio summary"
      className="grid stagger grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6"
    >
      <MetricCard
        label="Active customers"
        icon={<Building2 />}
        value={formatNumber(summary.activeCustomers)}
        detail={`${summary.newThisMonth} new this month · ${summary.onboarding} onboarding`}
        href="/customers?status=active"
        source="Customers with status Active"
      />
      <MetricCard
        label="Annual contract value"
        icon={<Banknote />}
        value={acv.value}
        detail={acv.detail}
        href="/commercial?status=active"
        source="Approved contract records"
        restricted={!financeScope}
      />
      <MetricCard
        label="Renewals in 120 days"
        icon={<CalendarClock />}
        value={formatNumber(summary.renewalCount)}
        detail={formatMoneyList(summary.renewalValue)}
        href="/commercial?renewal=120"
        source="Contracts ending within 120 days"
      >
        <SegmentedBar
          segments={summary.renewals.map((w, i) => ({
            key: w.label,
            label: w.label,
            value: w.count,
            color: renewalShades[i] ?? "var(--ap-chart-primary)",
          }))}
        />
        <ul className="mt-2 grid grid-cols-4 gap-1 text-micro text-fg-muted">
          {summary.renewals.map((w, i) => (
            <li key={w.label} className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="size-2 rounded-[2px]"
                style={{ background: renewalShades[i] }}
              />
              <span>
                <span className="font-medium text-fg tabular">{w.count}</span> ≤{w.withinDays}d
              </span>
            </li>
          ))}
        </ul>
      </MetricCard>
      <MetricCard
        label="Production deployments"
        icon={<Server />}
        value={formatNumber(summary.productionDeployments)}
        detail={
          summary.unsupportedProduction > 0 ? (
            <StatusBadge
              tone="risk"
              label={`${summary.unsupportedProduction} on unsupported releases`}
            />
          ) : (
            "All on supported releases"
          )
        }
        href="/deployments?environment=production"
        source="Supported production deployments"
      />
      <MetricCard
        label="License risk"
        icon={<KeyRound />}
        value={formatNumber(risk.total)}
        detail={riskParts.join(" · ") || "No licenses at risk"}
        href="/licensing?risk=any"
        source="Expiring, grace, suspended, failed, drift"
      >
        <Sparkline
          values={licenseRiskTrend}
          label={`License risk over 12 weeks, now ${risk.total}`}
        />
      </MetricCard>
      <MetricCard
        label="Pending approvals"
        icon={<Stamp />}
        value={formatNumber(summary.pendingApprovals)}
        detail={`${summary.highImpactApprovals} high impact · oldest ${summary.oldestApprovalDays} days`}
        href="/approvals?view=team"
        source="Governed requests awaiting decision"
      />
    </section>
  );
}

// Customer health ------------------------------------------------------------------------------

/** Shown on widgets whose source data is portfolio-wide, so filtered views never mislead. */
function UnfilteredNote({ what }: { what: string }) {
  return (
    <p className="text-micro text-fg-muted">
      {what} is portfolio-wide and ignores customer filters.
    </p>
  );
}

export function HealthCard({
  summary,
  history,
  filtered,
}: {
  summary: PortfolioSummary;
  history: HealthSnapshot[];
  filtered: boolean;
}) {
  const order: HealthStatus[] = ["healthy", "watch", "at_risk", "critical"];
  return (
    <Card aria-labelledby="widget-health">
      <CardHeader>
        <div>
          <CardTitle id="widget-health">Customer health</CardTitle>
          <CardDescription>
            Advisory score; value at risk {formatMoneyList(summary.valueAtRisk)}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SegmentedBar
          segments={summary.health.map((h) => ({
            key: h.status,
            label: healthStatus[h.status].label,
            value: h.count,
            color: healthColor[h.status],
          }))}
        />
        <ul className="flex flex-col">
          {summary.health.map((h) => {
            const Icon = healthIcon[h.status];
            return (
              <li key={h.status}>
                <Link
                  href={`/customers?health=${h.status}`}
                  className="flex items-center gap-2 rounded-control px-1.5 py-1 text-dense hover:bg-surface-hover"
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ background: healthColor[h.status] }}
                  />
                  <Icon aria-hidden="true" className="size-3.5 shrink-0 text-fg-muted" />
                  <span className="text-fg">{healthStatus[h.status].label}</span>
                  <span className="ms-auto w-6 text-end font-semibold text-fg tabular">
                    {h.count}
                  </span>
                  <span className="w-44 text-end text-micro text-fg-muted">
                    {formatMoneyList(h.value)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div>
          <p className="mb-1 text-micro font-medium text-fg-muted">Customers by health, monthly</p>
          {filtered ? <UnfilteredNote what="Monthly history" /> : null}
          <StackedColumns
            label="Customers by health status per month"
            periods={history.map((h) => monthLabel(h.month))}
            segments={order.map((status) => ({
              key: status,
              label: healthStatus[status].label,
              color: healthColor[status],
            }))}
            values={history.map((h) => [h.healthy, h.watch, h.atRisk, h.critical])}
          />
          <ChartTable
            caption="Customers by health status per month"
            columns={["Month", ...order.map((s) => healthStatus[s].label)]}
            rows={history.map((h) => [
              monthLabel(h.month),
              h.healthy,
              h.watch,
              h.atRisk,
              h.critical,
            ])}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Release exposure -------------------------------------------------------------------------------

export function ReleaseExposureCard({ summary, now }: { summary: PortfolioSummary; now: string }) {
  return (
    <Card aria-labelledby="widget-releases">
      <CardHeader>
        <div>
          <CardTitle id="widget-releases">Release exposure</CardTitle>
          <CardDescription>Deployments on each release, with end of support risk</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <BarList
          items={summary.releaseExposure.map((r) => ({
            key: r.releaseId,
            label: <span className="font-mono">{r.version}</span>,
            value: r.deployments,
            valueLabel: `${plural(r.deployments, "deployment")} · ${plural(r.customers, "customer")}`,
            href: `/releases/${r.releaseId}`,
            risk: r.atRisk,
            note: r.endOfSupportAt
              ? `${releaseStatus[r.status].label} · support ${daysUntil(r.endOfSupportAt, now) < 0 ? "ended" : "ends"} ${formatRelativeDays(r.endOfSupportAt, now)}`
              : releaseStatus[r.status].label,
            accessibleLabel: `Release ${r.version}: ${plural(r.deployments, "deployment")} across ${plural(r.customers, "customer")}, ${releaseStatus[r.status].label}${r.endOfSupportAt ? `, end of support ${formatDate(r.endOfSupportAt)}` : ""}${r.atRisk ? ", at risk" : ""}`,
          }))}
        />
      </CardContent>
      <CardFooter>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[2px] bg-chart-risk" />
          Coral: end of support passed or within 90 days
        </span>
      </CardFooter>
    </Card>
  );
}

// Cost to serve ------------------------------------------------------------------------------------

export function CostCard({
  summary,
  products,
  costImport,
  now,
}: {
  summary: PortfolioSummary;
  products: Product[];
  costImport: { lastImportedAt: string; source: string };
  now: string;
}) {
  const stale = Date.parse(now) - Date.parse(costImport.lastImportedAt) > 2 * 86_400_000;
  const series = products
    .filter((p) => summary.costTrend.some((point) => point.byProduct[p.id] !== undefined))
    .map((p, index) => ({
      key: p.id,
      label: p.name,
      color: index === 0 ? "var(--ap-chart-primary)" : "var(--ap-chart-neutral)",
      values: summary.costTrend.map((point) => (point.byProduct[p.id] ?? 0) / 100),
    }));
  const latest = summary.costTrend.at(-1);
  const gbp = (value: number) =>
    formatMoneyCompact({ amountMinor: Math.round(value * 100), currency: "GBP" });

  return (
    <Card aria-labelledby="widget-cost">
      <CardHeader>
        <div>
          <CardTitle id="widget-cost">Cost to serve</CardTitle>
          <CardDescription>Apporine cloud cost by product, monthly, GBP</CardDescription>
        </div>
        {latest ? (
          <div className="text-end">
            <p className="text-section-title text-fg">{gbp(latest.total / 100)}</p>
            <p className="text-micro text-fg-muted">
              {latest.supportHours} support hours this month
            </p>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {stale ? (
          <Notice tone="risk" title="Cost data delayed">
            Last imported {formatRelativeDays(costImport.lastImportedAt, now)} from{" "}
            {costImport.source}. The current month may be incomplete.
          </Notice>
        ) : null}
        <LineChart
          label="Apporine cloud cost by product per month"
          xLabels={summary.costTrend.map((p) => monthLabel(p.month))}
          series={series}
          format="gbp"
        />
        <ChartTable
          caption="Apporine cloud cost by product per month"
          columns={["Month", ...series.map((s) => s.label), "Support hours"]}
          rows={summary.costTrend.map((p, i) => [
            monthLabel(p.month),
            ...series.map((s) => gbp(s.values[i] ?? 0)),
            p.supportHours,
          ])}
        />
      </CardContent>
      <CardFooter>
        <span>Customer-hosted cloud spend is not visible to Apporine and is not included.</span>
        <Link
          href="/analytics?report=cost-to-serve"
          className="inline-flex shrink-0 items-center gap-1 font-medium text-violet-text hover:underline"
        >
          Open report <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}

// Audit activity ------------------------------------------------------------------------------------

export function AuditActivityCard({
  activity,
  filtered,
}: {
  filtered: boolean;
  activity: {
    daily: Array<{ date: string; actions: number; failures: number }>;
    uniqueActors: number;
    productsAffected: number;
    highImpactEvents: number;
  };
}) {
  const total = activity.daily.reduce((sum, d) => sum + d.actions, 0);
  const failures = activity.daily.reduce((sum, d) => sum + d.failures, 0);
  const stats = [
    { label: "Admin actions", value: formatNumber(total) },
    { label: "Unique actors", value: formatNumber(activity.uniqueActors) },
    { label: "Products affected", value: formatNumber(activity.productsAffected) },
    { label: "Failure rate", value: formatPercent(total ? failures / total : 0, 1) },
    { label: "High risk events", value: formatNumber(activity.highImpactEvents) },
  ];
  return (
    <Card aria-labelledby="widget-audit">
      <CardHeader>
        <div>
          <CardTitle id="widget-audit">Audit activity</CardTitle>
          <CardDescription>Administrative actions per day, last 14 days</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {filtered ? <UnfilteredNote what="Audit activity" /> : null}
        <dl className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-micro text-fg-muted">{stat.label}</dt>
              <dd className="text-section-title text-fg tabular">{stat.value}</dd>
            </div>
          ))}
        </dl>
        <LineChart
          label="Administrative actions and failures per day"
          xLabels={activity.daily.map((d) => dayLabel(d.date))}
          series={[
            {
              key: "actions",
              label: "Actions",
              color: "var(--ap-chart-primary)",
              values: activity.daily.map((d) => d.actions),
            },
            {
              key: "failures",
              label: "Failures",
              color: "var(--ap-chart-risk)",
              values: activity.daily.map((d) => d.failures),
            },
          ]}
          format="number"
        />
        <ChartTable
          caption="Administrative actions and failures per day"
          columns={["Day", "Actions", "Failures"]}
          rows={activity.daily.map((d) => [dayLabel(d.date), d.actions, d.failures])}
        />
      </CardContent>
      <CardFooter>
        <span>Source: audit event store</span>
        <Link
          href="/audit"
          className="inline-flex shrink-0 items-center gap-1 font-medium text-violet-text hover:underline"
        >
          Open audit log <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}

// Operational inbox -----------------------------------------------------------------------------------

export function OperationalInbox({
  summary,
  customerNames,
  staff,
  now,
}: {
  summary: PortfolioSummary;
  customerNames: Record<string, string>;
  staff: Record<string, StaffUser>;
  now: string;
}) {
  return (
    <Card
      aria-labelledby="inbox-title"
      className="xl:sticky xl:top-[calc(var(--ap-topbar-height)+5.5rem)]"
    >
      <CardHeader>
        <div>
          <CardTitle id="inbox-title">Operational inbox</CardTitle>
          <CardDescription>{summary.inbox.length} items, most urgent first</CardDescription>
        </div>
      </CardHeader>
      <ol className="flex flex-col px-2 pb-2">
        {summary.inbox.map((task) => {
          const overdue = Date.parse(task.dueAt) < Date.parse(now);
          return (
            <li key={task.id} className="border-t border-border first:border-t-0">
              <Link
                href={task.href}
                className="flex flex-col gap-1.5 rounded-control px-2 py-3 hover:bg-surface-hover"
              >
                <span className="flex items-center gap-2">
                  <StatusBadge
                    tone={priorityPresentation[task.priority].tone}
                    label={priorityPresentation[task.priority].label}
                  />
                  {task.customerId ? (
                    <span className="truncate text-micro font-medium text-fg-secondary">
                      {customerNames[task.customerId]}
                    </span>
                  ) : null}
                </span>
                <span className="text-dense text-fg">{task.title}</span>
                <span className="text-micro text-fg-muted">
                  {staff[task.ownerId]?.name ?? "Unassigned"} ·{" "}
                  <span className={overdue ? "font-medium text-coral-text" : undefined}>
                    {overdue ? "Overdue, was due" : "Due"} {formatRelativeDays(task.dueAt, now)}
                  </span>{" "}
                  <time dateTime={task.dueAt}>({formatDate(task.dueAt)})</time>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
