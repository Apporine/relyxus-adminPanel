import { Download, Server, Tags, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { ChartTable } from "@/components/charts/chart-table";
import { LineChart } from "@/components/charts/line-chart";
import { BarList } from "@/components/charts/simple-charts";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { Field, Label, Select, Textarea } from "@/components/ui/field";
import { MetricCard } from "@/components/ui/metric-card";
import { SegmentNav } from "@/components/ui/segment-nav";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { allocationViews, toGbp, type AllocationView } from "@/domain/finance";
import { cn } from "@/lib/cn";
import { formatPercent, plural } from "@/lib/format";
import { FinanceRestricted, gbpCompact, gbpEstimate, SourceNotices } from "./finance-parts";
import { loadFinance, type FinanceData } from "./load";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

function Methodology({ data }: { data: FinanceData }) {
  return (
    <Notice title="Estimates of Apporine's direct cost to serve">
      Cloud cost is Apporine&apos;s own AWS cost for {monthLabel(data.month)}. Customer-hosted
      Relyxus runs in the customer&apos;s cloud, and that bill is never included. Time is costed at
      blended labor rates ({data.labor.source}). Contract values in other currencies use
      finance-approved rates ({data.fx.source}).
    </Notice>
  );
}

/** Allocation view switcher; each view is a shareable URL. */
function AllocationSwitch({ data, path }: { data: FinanceData; path: string }) {
  return (
    <div className="flex flex-col gap-2">
      <SegmentNav
        label="Allocation view"
        items={(Object.keys(allocationViews) as AllocationView[]).map((v) => ({
          href: v === "by_value" ? path : `${path}?allocation=${v}`,
          label: allocationViews[v].label,
          current: v === data.view,
        }))}
      />
      <p className="text-micro text-fg-muted">{allocationViews[data.view].description}</p>
    </div>
  );
}

function ExportReport({ title }: { title: string }) {
  return (
    <DesignPreviewDialog
      trigger="Export report"
      triggerVariant="primary"
      triggerIcon={<Download aria-hidden="true" />}
      title={`Export ${title.toLowerCase()}`}
      description="The export contains only fields you are authorized to view. Estimates stay labelled as estimates. The export event is recorded in audit."
      confirmLabel="Queue export"
    >
      <Field>
        <Label htmlFor="finance-format">Format</Label>
        <Select id="finance-format" name="format" defaultValue="csv">
          <option value="csv">CSV</option>
          <option value="xlsx">Spreadsheet</option>
        </Select>
      </Field>
      <Field>
        <Label htmlFor="finance-reason">Reason</Label>
        <Textarea id="finance-reason" name="reason" required />
      </Field>
    </DesignPreviewDialog>
  );
}

/**
 * Cost to serve (spec §22, §30): summary metrics, product trend, customer table, cost
 * source status and methodology. Every estimate is labelled, sourced and drillable.
 */
export async function CostToServe({ searchParams }: { searchParams: SearchParams }) {
  const data = await loadFinance(await searchParams);
  if (!data.canView) return <FinanceRestricted />;

  const cloudTotal = data.lines.reduce((sum, l) => sum + toGbp(l.amount, data.fx), 0);
  const allocated = cloudTotal - data.unallocatedMonthly;
  const labor = data.rows.reduce((sum, r) => sum + r.monthly.support + r.monthly.operations, 0);
  const rows = [...data.rows]
    .filter((r) => r.monthly.total > 0)
    .sort((a, b) => b.annualCost - a.annualCost);
  const totalAnnual = rows.reduce((sum, r) => sum + r.annualCost, 0);
  const months = [...new Set(data.snapshots.map((s) => s.month))].filter((m) => m <= data.month);
  const series = data.products.map((p, i) => ({
    key: p.id,
    label: p.name,
    color: i === 0 ? "var(--ap-chart-primary)" : "var(--ap-chart-neutral)",
    values: months.map(
      (m) =>
        (data.snapshots.find((s) => s.month === m && s.productId === p.id)?.cloudCost.amountMinor ??
          0) / 100,
    ),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AllocationSwitch data={data} path="/analytics/finance/cost-to-serve" />
        <ExportReport title="Cost to serve" />
      </div>
      <SourceNotices data={data} uses={["aws_cur", "support_time"]} />

      <section aria-label="Cost summary" className="grid stagger grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          label="Apporine cloud cost"
          value={gbpCompact(cloudTotal)}
          detail={`${monthLabel(data.month)} · ${formatPercent(allocated / cloudTotal)} allocated`}
          href="/analytics/finance/attribution"
          source="AWS cost by account and tags"
          icon={<Server />}
        />
        <MetricCard
          label="Support and operations"
          value={gbpCompact(labor)}
          detail={`${data.time.reduce((s, t) => s + t.supportHours + t.operationsHours, 0)} approved hours`}
          href="#customer-costs"
          source="Approved time records at blended rates"
          icon={<Users />}
        />
        <MetricCard
          label="Annual cost to serve"
          value={gbpEstimate(totalAnnual)}
          detail="Allocated cost, annualized"
          href="#customer-costs"
          source={`Estimate: ${allocationViews[data.view].label.toLowerCase()}`}
          icon={<Wallet />}
        />
        <MetricCard
          label="Unallocated cloud cost"
          value={gbpCompact(data.unallocatedMonthly)}
          detail={`${formatPercent(data.unallocatedMonthly / cloudTotal)} of the month`}
          href="/analytics/finance/attribution"
          source="Untagged lines and shared cost this view does not allocate"
          icon={<Tags />}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card aria-labelledby="trend-title">
          <CardHeader>
            <div>
              <CardTitle id="trend-title">Cloud cost by product</CardTitle>
              <CardDescription>Monthly Apporine AWS cost.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <LineChart
              label="Apporine cloud cost by product per month"
              xLabels={months.map(monthLabel)}
              series={series}
              format="gbp"
            />
            <ChartTable
              caption="Apporine cloud cost by product per month"
              columns={["Month", ...series.map((s) => s.label)]}
              rows={months.map((m, i) => [
                monthLabel(m),
                ...series.map((s) => gbpCompact((s.values[i] ?? 0) * 100)),
              ])}
            />
          </CardContent>
        </Card>
        <Card aria-labelledby="bars-title">
          <CardHeader>
            <div>
              <CardTitle id="bars-title">Largest cost to serve</CardTitle>
              <CardDescription>Annualized estimate per customer.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BarList
              items={rows.slice(0, 6).map((r) => ({
                key: r.customerId,
                label: data.customerById[r.customerId]?.displayName,
                value: r.annualCost,
                valueLabel: gbpEstimate(r.annualCost),
                note: formatPercent(r.annualCost / totalAnnual),
                href: `/customers/${r.customerId}?tab=finance`,
                accessibleLabel: `${data.customerById[r.customerId]?.displayName}: ${gbpEstimate(r.annualCost)} a year`,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card id="customer-costs" aria-labelledby="customers-title" className="scroll-mt-20">
        <CardHeader>
          <div>
            <CardTitle id="customers-title">Cost to serve by customer</CardTitle>
            <CardDescription>
              Monthly cost for {monthLabel(data.month)}; annual figures are estimates rounded to
              £1,000.
            </CardDescription>
          </div>
        </CardHeader>
        <Table label="Cost to serve by customer" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell className="text-end">Cloud</TableHeaderCell>
              <TableHeaderCell className="text-end">Support</TableHeaderCell>
              <TableHeaderCell className="text-end">Operations</TableHeaderCell>
              <TableHeaderCell className="text-end">Annual cost</TableHeaderCell>
              <TableHeaderCell className="text-end">Share</TableHeaderCell>
              <TableHeaderCell className="text-end">Contract value</TableHeaderCell>
              <TableHeaderCell className="text-end">Margin estimate</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.customerId}>
                <TableCell>
                  <Link
                    href={`/customers/${r.customerId}?tab=finance`}
                    className="font-medium text-fg hover:text-violet-text hover:underline"
                  >
                    {data.customerById[r.customerId]?.displayName}
                  </Link>
                </TableCell>
                <TableCell className="text-end tabular">{gbpCompact(r.monthly.cloud)}</TableCell>
                <TableCell className="text-end tabular">{gbpCompact(r.monthly.support)}</TableCell>
                <TableCell className="text-end tabular">
                  {gbpCompact(r.monthly.operations)}
                </TableCell>
                <TableCell className="text-end tabular">{gbpEstimate(r.annualCost)}</TableCell>
                <TableCell className="text-end tabular">
                  {formatPercent(r.annualCost / totalAnnual)}
                </TableCell>
                <TableCell className="text-end tabular">
                  {r.acvGbp === undefined ? (
                    <span className="text-fg-muted">No contract value</span>
                  ) : (
                    <>
                      {gbpCompact(r.acvGbp)}
                      {r.converted ? (
                        <span className="block text-micro text-fg-muted">
                          converted from {r.acv!.currency}
                        </span>
                      ) : null}
                    </>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-end tabular",
                    r.margin !== undefined && r.margin < 0 && "font-medium text-coral-text",
                  )}
                >
                  {r.margin === undefined ? "—" : gbpEstimate(r.margin)}
                  {r.marginRatio === undefined ? null : (
                    <span className="block text-micro text-fg-muted">
                      {formatPercent(r.marginRatio)}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <CostSources data={data} />
      <Methodology data={data} />
    </div>
  );
}

function CostSources({ data }: { data: FinanceData }) {
  const tone = { current: "healthy", delayed: "risk", unavailable: "critical" } as const;
  const label = { current: "Current", delayed: "Delayed", unavailable: "Unavailable" };
  return (
    <Card aria-labelledby="sources-title">
      <CardHeader>
        <CardTitle id="sources-title">Cost sources</CardTitle>
      </CardHeader>
      <Table label="Cost sources" className="whitespace-nowrap">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Source</TableHeaderCell>
            <TableHeaderCell>System</TableHeaderCell>
            <TableHeaderCell>Covers</TableHeaderCell>
            <TableHeaderCell>State</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.sources.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>{s.system}</TableCell>
              <TableCell className="text-fg-secondary">{s.covers}</TableCell>
              <TableCell>
                <StatusBadge tone={tone[s.state]} label={label[s.state]} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/**
 * Margin estimate: contract value minus allocated direct cost, shown as a range across
 * allocation methods so the uncertainty is visible (spec §22).
 */
export async function MarginEstimate() {
  const data = await loadFinance();
  if (!data.canView) return <FinanceRestricted />;

  const rows = data.rows
    .map((r, i) => ({ ...r, range: data.ranges[i]! }))
    .filter((r) => r.margin !== undefined)
    .sort((a, b) => (a.marginRatio ?? 0) - (b.marginRatio ?? 0));
  const excluded = data.rows.filter((r) => r.margin === undefined);
  const scale = Math.max(...rows.map((r) => Math.abs(r.range.high ?? 0)), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-body text-fg-secondary">
          Annual contract value minus allocated direct service cost. The range spans the three
          allocation methods; the point uses shared cost by contract value. Lowest margin first.
        </p>
        <ExportReport title="Margin estimate" />
      </div>
      <SourceNotices data={data} uses={["aws_cur"]} />
      <Card>
        <Table label="Margin estimate by customer" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell className="text-end">Contract value</TableHeaderCell>
              <TableHeaderCell className="text-end">Annual cost</TableHeaderCell>
              <TableHeaderCell className="text-end">Margin estimate</TableHeaderCell>
              <TableHeaderCell>Range across methods</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.customerId}>
                <TableCell>
                  <Link
                    href={`/customers/${r.customerId}?tab=finance`}
                    className="font-medium text-fg hover:text-violet-text hover:underline"
                  >
                    {data.customerById[r.customerId]?.displayName}
                  </Link>
                  {r.converted ? <Tag className="ms-2">{r.acv!.currency}</Tag> : null}
                </TableCell>
                <TableCell className="text-end tabular">{gbpCompact(r.acvGbp!)}</TableCell>
                <TableCell className="text-end tabular">{gbpEstimate(r.annualCost)}</TableCell>
                <TableCell className="text-end tabular">
                  {gbpEstimate(r.margin!)}
                  <span className="block text-micro text-fg-muted">
                    {formatPercent(r.marginRatio ?? 0)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="relative h-2 w-40 rounded-full bg-surface-sunken"
                    >
                      <span
                        className="absolute inset-y-0 chart-grow-x rounded-full bg-linear-to-r from-violet to-cyan"
                        style={{
                          left: `${Math.max(0, (r.range.low! / scale) * 100)}%`,
                          width: `${Math.max(2, ((r.range.high! - Math.max(0, r.range.low!)) / scale) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="text-micro text-fg-secondary tabular">
                      {gbpEstimate(r.range.low!)} to {gbpEstimate(r.range.high!)}
                    </span>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {excluded.length ? (
        <Notice title={`${plural(excluded.length, "customer")} not estimated`}>
          {excluded.map((r) => data.customerById[r.customerId]?.displayName).join(", ")}: no
          approved contract value yet.
        </Notice>
      ) : null}
      <Methodology data={data} />
    </div>
  );
}

/** Cost attribution: tag coverage by AWS account and the lines nobody owns yet. */
export async function CostAttribution() {
  const data = await loadFinance();
  if (!data.canView) return <FinanceRestricted />;

  const total = data.lines.reduce((sum, l) => sum + l.amount.amountMinor, 0);
  const accounts = [...new Set(data.lines.map((l) => l.account))].map((account) => {
    const lines = data.lines.filter((l) => l.account === account);
    const sum = (tag: string) =>
      lines.filter((l) => l.tag === tag).reduce((s, l) => s + l.amount.amountMinor, 0);
    return {
      account,
      customer: sum("customer"),
      product: sum("product"),
      untagged: sum("untagged"),
      total: lines.reduce((s, l) => s + l.amount.amountMinor, 0),
    };
  });
  const byTag = (tag: string) =>
    data.lines.filter((l) => l.tag === tag).reduce((s, l) => s + l.amount.amountMinor, 0);
  const untagged = data.lines.filter((l) => l.tag === "untagged");

  return (
    <div className="flex flex-col gap-6">
      <SourceNotices data={data} uses={["aws_cur"]} />
      <section aria-label="Tag coverage" className="grid stagger grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            ["customer", "Tagged to a customer", "Allocated directly"],
            ["product", "Tagged to a product", "Shared by the allocation view"],
            ["untagged", "Untagged", "Never allocated"],
          ] as const
        ).map(([tag, label, detail]) => (
          <MetricCard
            key={tag}
            label={label}
            value={formatPercent(byTag(tag) / total)}
            detail={`${gbpCompact(byTag(tag))} · ${detail}`}
            href="#accounts"
            source={`AWS cost tags, ${monthLabel(data.month)}`}
          />
        ))}
      </section>

      <Card id="accounts" aria-labelledby="accounts-title" className="scroll-mt-20">
        <CardHeader>
          <CardTitle id="accounts-title">Cost by AWS account</CardTitle>
        </CardHeader>
        <Table label="Cost by AWS account" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Account</TableHeaderCell>
              <TableHeaderCell className="text-end">Customer tagged</TableHeaderCell>
              <TableHeaderCell className="text-end">Product tagged</TableHeaderCell>
              <TableHeaderCell className="text-end">Untagged</TableHeaderCell>
              <TableHeaderCell className="text-end">Total</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.map((a) => (
              <TableRow key={a.account}>
                <TableCell className="font-mono text-micro">{a.account}</TableCell>
                <TableCell className="text-end tabular">{gbpCompact(a.customer)}</TableCell>
                <TableCell className="text-end tabular">{gbpCompact(a.product)}</TableCell>
                <TableCell
                  className={cn("text-end tabular", a.untagged && "font-medium text-coral-text")}
                >
                  {gbpCompact(a.untagged)}
                </TableCell>
                <TableCell className="text-end tabular">{gbpCompact(a.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card aria-labelledby="gaps-title">
        <CardHeader>
          <div>
            <CardTitle id="gaps-title">Tagging gaps</CardTitle>
            <CardDescription>
              Untagged lines stay unallocated rather than being guessed into a customer.
            </CardDescription>
          </div>
          <DesignPreviewDialog
            trigger="Request tagging fix"
            triggerSize="sm"
            title="Request tagging fix"
            description="Ask the platform team to tag these resources. Allocation changes only after the next cost import."
            confirmLabel="Send request"
          >
            <Field>
              <Label htmlFor="tag-note">Note</Label>
              <Textarea id="tag-note" name="note" required />
            </Field>
          </DesignPreviewDialog>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {untagged.map((l) => (
              <li key={`${l.account}-${l.service}`} className="flex justify-between gap-3">
                <span>
                  <span className="text-dense font-medium text-fg">{l.service}</span>
                  <span className="block font-mono text-micro text-fg-muted">{l.account}</span>
                </span>
                <span className="text-dense text-fg tabular">
                  {gbpCompact(l.amount.amountMinor)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
