import { Gauge, ShieldAlert, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SegmentedBar } from "@/components/charts/simple-charts";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { ContentSkeleton } from "@/components/ui/skeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { sumByCurrency } from "@/domain/money";
import { healthStatus } from "@/domain/status";
import { withOverrides } from "@/domain/success";
import type { HealthStatus } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatDate, formatMoneyList, formatTimestamp } from "@/lib/format";
import { loadSuccess } from "./load";
import { ScoreBar } from "./success-parts";

const order: HealthStatus[] = ["critical", "at_risk", "watch", "healthy"];
const segmentColor: Record<HealthStatus, string> = {
  critical: "var(--ap-chart-critical)",
  at_risk: "var(--ap-chart-risk)",
  watch: "var(--ap-chart-neutral)",
  healthy: "var(--ap-chart-healthy)",
};

const factorStatus = {
  ok: { label: "Good", className: "text-cyan-text" },
  attention: { label: "Attention", className: "text-fg-secondary" },
  risk: { label: "Risk", className: "text-coral-text" },
  not_measured: { label: "Not measured", className: "text-fg-muted" },
} as const;

/** Health overview (spec §19): distribution, value by health, and every customer's score. */
export async function HealthOverview() {
  const data = await loadSuccess();
  const rows = [...data.health].sort((a, b) => a.score - b.score);
  const groups = order.map((status) => {
    const customers = data.customers.filter((c) => c.health === status);
    return {
      status,
      count: customers.length,
      value: sumByCurrency(customers.map((c) => c.annualContractValue)),
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="distribution-title">
        <CardHeader>
          <div>
            <CardTitle id="distribution-title">Customer health</CardTitle>
            <CardDescription>
              Advisory, explainable score. Last calculated {formatTimestamp(data.now)}.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SegmentedBar
            className="h-3"
            segments={groups.map((g) => ({
              key: g.status,
              label: healthStatus[g.status].label,
              value: g.count,
              color: segmentColor[g.status],
            }))}
          />
          <dl className="grid stagger grid-cols-2 gap-3 lg:grid-cols-4">
            {groups.map((g) => (
              <div key={g.status} className="rounded-control bg-surface-sunken/70 px-3 py-2.5">
                <dt className="flex items-center gap-2 text-dense text-fg-secondary">
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-sm"
                    style={{ background: segmentColor[g.status] }}
                  />
                  {healthStatus[g.status].label}
                </dt>
                <dd className="mt-0.5 text-section-title text-fg tabular">{g.count}</dd>
                <dd className="text-micro text-fg-muted tabular">
                  {g.value.length ? formatMoneyList(g.value) : "No contract value"}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <Table label="Customer health scores" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Score</TableHeaderCell>
              <TableHeaderCell>Health</TableHeaderCell>
              <TableHeaderCell>Factors at risk</TableHeaderCell>
              <TableHeaderCell>Override</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(({ customer, factors, score }) => {
              const risky = factors.filter((f) => f.status === "risk");
              const override = data.overrides.find(
                (o) =>
                  o.customerId === customer.id && Date.parse(o.expiresAt) > Date.parse(data.now),
              );
              return (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link
                      href={`/success/health/${customer.id}`}
                      className="font-medium text-fg hover:text-violet-text hover:underline"
                    >
                      {customer.displayName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ScoreBar score={score} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      tone={healthStatus[customer.health].tone}
                      label={healthStatus[customer.health].label}
                    />
                  </TableCell>
                  <TableCell>
                    {risky.length ? (
                      <span className="flex flex-wrap gap-1">
                        {risky.map((f) => (
                          <Tag key={f.key} className="bg-coral-subtle text-coral-text">
                            {f.label}
                          </Tag>
                        ))}
                      </span>
                    ) : (
                      <span className="text-fg-muted">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {override ? `Until ${formatDate(override.expiresAt)}` : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/**
 * Customer health detail (spec §19): score, factor contribution, signals, sources, last
 * calculation and overrides with the calculated value still visible.
 */
export async function CustomerHealthDetail({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const data = await loadSuccess();
  const entry = data.health.find((h) => h.customer.id === customerId);
  if (!entry) notFound();
  const { customer, score } = entry;
  const factors = withOverrides(customer.id, entry.factors, data.overrides, data.now);
  const maxImpact = Math.max(1, ...factors.map((f) => f.impact));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[{ label: "Success", href: "/success" }, { label: customer.displayName }]}
        />
        <PageHeader
          title={`${customer.displayName} health`}
          description={`Calculated ${formatTimestamp(data.now)} from approved records. Advisory: it supports prioritization, it does not replace judgment.`}
          meta={
            <StatusBadge
              tone={healthStatus[customer.health].tone}
              label={healthStatus[customer.health].label}
            />
          }
          actions={
            <>
              <Button asChild>
                <Link href={`/success/plans/${customer.id}`}>
                  <Gauge aria-hidden="true" />
                  Success plan
                </Link>
              </Button>
              <DesignPreviewDialog
                trigger="Override a factor"
                triggerIcon={<SlidersHorizontal aria-hidden="true" />}
                title="Override derived risk"
                description="Overrides need a reason and an expiry, and approval where policy requires it. The calculated value stays visible."
                confirmLabel="Request override"
              >
                <Field>
                  <Label htmlFor="override-factor">Factor</Label>
                  <Select id="override-factor" name="factor" defaultValue={factors[0]?.key}>
                    {factors.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <Label htmlFor="override-expiry">Expires</Label>
                  <Input id="override-expiry" name="expiresAt" type="date" required />
                </Field>
                <Field>
                  <Label htmlFor="override-reason">Reason</Label>
                  <Textarea id="override-reason" name="reason" required />
                  <FieldHint>Stored with the override and shown beside the factor.</FieldHint>
                </Field>
              </DesignPreviewDialog>
            </>
          }
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute -end-16 -top-16 size-48 rounded-full bg-linear-to-br from-violet/20 to-cyan/15 blur-2xl"
          />
          <CardContent className="relative flex flex-col items-center gap-2 py-8">
            <p className="text-dense text-fg-muted">Health score</p>
            <p className="text-[3.5rem] leading-none font-semibold text-fg tabular">{score}</p>
            <p className="text-dense text-fg-muted">out of 100</p>
            <p className="mt-2 text-center text-micro text-fg-muted">Illustrative weights</p>
          </CardContent>
        </Card>

        <Card aria-labelledby="factors-title">
          <CardHeader>
            <div>
              <CardTitle id="factors-title">Factor contribution</CardTitle>
              <CardDescription>
                Points each factor deducts from 100, with the signals behind it.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex stagger flex-col gap-4">
              {factors.map((f) => (
                <li key={f.key} className="rounded-control border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-fg">{f.label}</p>
                    <p className="flex items-center gap-2 text-dense">
                      <span className={cn("font-medium", factorStatus[f.status].className)}>
                        Calculated: {factorStatus[f.status].label}
                      </span>
                      {f.override ? (
                        <Tag className="bg-violet-subtle text-violet-text">
                          Override: {factorStatus[f.override.to].label}
                        </Tag>
                      ) : null}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken"
                    >
                      <span
                        className={cn(
                          "block h-full chart-grow-x rounded-full",
                          f.status === "risk" ? "bg-chart-critical" : "bg-chart-primary-2",
                        )}
                        style={{ width: `${(f.impact / maxImpact) * 100}%` }}
                      />
                    </span>
                    <span className="w-16 text-end text-micro text-fg-secondary tabular">
                      −{f.impact} pts
                    </span>
                  </div>
                  {f.signals.length ? (
                    <ul className="mt-2 flex list-disc flex-col gap-0.5 ps-5 text-dense text-fg-secondary">
                      {f.signals.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  ) : null}
                  {f.override ? (
                    <p className="mt-2 flex items-start gap-1.5 text-micro text-fg-muted">
                      <ShieldAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                      {f.override.reason} By {data.staff[f.override.byId]?.name}
                      {f.override.approverId
                        ? `, approved by ${data.staff[f.override.approverId]?.name}`
                        : ""}
                      , until {formatDate(f.override.expiresAt)}.
                    </p>
                  ) : null}
                  {f.sources.length ? (
                    <p className="mt-2 flex flex-wrap gap-x-3 text-micro">
                      {f.sources.map((s) => (
                        <Link
                          key={s.href}
                          href={s.href}
                          className="text-violet-text hover:underline"
                        >
                          {s.label}
                        </Link>
                      ))}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SuccessSkeleton() {
  return <ContentSkeleton label="success data" metrics={4} />;
}
