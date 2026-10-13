import Link from "next/link";
import { ChartTable } from "@/components/charts/chart-table";
import { BarList } from "@/components/charts/simple-charts";
import { StackedColumns } from "@/components/charts/stacked-columns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { auditFilterParams, type AuditFilters } from "@/domain/audit";
import { formatNumber, formatPercent, formatTimestamp, plural } from "@/lib/format";
import { AuditFilterBar, auditQuery, ResultBadge } from "./audit-parts";
import { loadAudit } from "./load";

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** Link to the audit log with the current filters plus one more. */
const logHref = (filters: AuditFilters, extra: Record<string, string>) =>
  `/audit?${new URLSearchParams({ ...auditFilterParams(filters), ...extra }).toString()}`;

/**
 * Audit analytics (spec §24.1): every figure comes from the filtered events and drills
 * through to the audit log with the same filters.
 */
export async function AuditAnalytics({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await loadAudit(await searchParams);
  const a = data.analytics;
  const f = data.filters;

  return (
    <AuditFilterBar data={data}>
      <div className="flex flex-col gap-4 pt-4">
        <section
          aria-label="Audit analytics summary"
          className="grid stagger grid-cols-2 gap-4 xl:grid-cols-4"
        >
          <MetricCard
            label="Events"
            value={formatNumber(a.total)}
            detail={`${plural(a.uniqueActors, "unique actor")}`}
            href={`/audit${auditQuery(f)}`}
            source="Audit events matching the filters"
          />
          <MetricCard
            label="Failure rate"
            value={formatPercent(a.failureRate, 1)}
            detail={`${plural(a.failures, "failed or denied event")}`}
            href={`/audit${auditQuery(f)}`}
            source="Failed and denied results over all events"
          />
          <MetricCard
            label="High impact actions"
            value={formatNumber(a.highImpact.length)}
            detail="Revoke, key change, elevation, break glass"
            href={logHref(f, { impact: "high" })}
            source="Events marked high impact"
          />
          <MetricCard
            label="Exports"
            value={formatNumber(a.exports)}
            detail={`${a.sensitiveExports} with restricted fields`}
            href={logHref(f, { category: "exports" })}
            source="Export actions in the audit log"
          />
        </section>

        <Card aria-labelledby="volume-title">
          <CardHeader>
            <div>
              <CardTitle id="volume-title">Actions over time</CardTitle>
              <CardDescription>Per day, split by success and failure.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <StackedColumns
              label="Audit actions per day by result"
              periods={a.daily.map((d) => dayLabel(d.date))}
              segments={[
                { key: "success", label: "Successful", color: "var(--ap-chart-primary)" },
                { key: "failed", label: "Failed or denied", color: "var(--ap-chart-risk)" },
              ]}
              values={a.daily.map((d) => [d.success, d.failed])}
            />
            <ChartTable
              caption="Audit actions per day"
              columns={["Day", "Successful", "Failed or denied"]}
              rows={a.daily.map((d) => [dayLabel(d.date), d.success, d.failed])}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card aria-labelledby="actors-title">
            <CardHeader>
              <div>
                <CardTitle id="actors-title">Top actors</CardTitle>
                <CardDescription>By action volume.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <BarList
                items={a.topActors.map((actor) => ({
                  key: actor.id,
                  label: data.actorName(actor.id),
                  value: actor.count,
                  valueLabel: formatNumber(actor.count),
                  href: logHref(f, { actor: actor.id }),
                  accessibleLabel: `${data.actorName(actor.id)}: ${actor.count} events`,
                }))}
              />
            </CardContent>
          </Card>
          <Card aria-labelledby="customers-title">
            <CardHeader>
              <div>
                <CardTitle id="customers-title">Customers impacted</CardTitle>
                <CardDescription>
                  {plural(a.customers.length, "customer")} · {plural(a.products.length, "product")}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <BarList
                items={a.customers.slice(0, 6).map((c) => ({
                  key: c.id,
                  label: data.customerName[c.id] ?? c.id,
                  value: c.count,
                  valueLabel: formatNumber(c.count),
                  href: logHref(f, { customer: c.id }),
                  accessibleLabel: `${data.customerName[c.id]}: ${c.count} events`,
                }))}
              />
            </CardContent>
          </Card>
          <Card aria-labelledby="denials-title">
            <CardHeader>
              <div>
                <CardTitle id="denials-title">Repeated authorization denials</CardTitle>
                <CardDescription>Same actor denied the same action more than once.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {a.repeatedDenials.length ? (
                <ul className="flex flex-col gap-2">
                  {a.repeatedDenials.map((d) => (
                    <li key={`${d.actorId}-${d.action}`}>
                      <Link
                        href={logHref(f, { actor: d.actorId, result: "denied" })}
                        className="text-dense font-medium text-fg hover:text-violet-text hover:underline"
                      >
                        {data.actorName(d.actorId)}
                      </Link>
                      <span className="block text-micro text-fg-muted">
                        <code className="font-mono">{d.action}</code> denied {d.count} times
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body text-fg-muted">No repeated denials.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card aria-labelledby="high-impact-title">
          <CardHeader>
            <div>
              <CardTitle id="high-impact-title">High impact actions</CardTitle>
              <CardDescription>Newest first. Open one to see its full trail.</CardDescription>
            </div>
          </CardHeader>
          {a.highImpact.length ? (
            <Table label="High impact actions" className="whitespace-nowrap">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Timestamp</TableHeaderCell>
                  <TableHeaderCell>Actor</TableHeaderCell>
                  <TableHeaderCell>Action</TableHeaderCell>
                  <TableHeaderCell>Object</TableHeaderCell>
                  <TableHeaderCell>Result</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {a.highImpact.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link
                        href={logHref(f, { event: e.id })}
                        className="font-medium text-fg hover:text-violet-text hover:underline"
                      >
                        {formatTimestamp(e.at)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {data.actorName(e.actorId)}
                      {e.effectiveIdentity ? (
                        <span className="block text-micro text-coral-text">
                          as {e.effectiveIdentity}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{e.actionLabel}</TableCell>
                    <TableCell className="font-mono text-micro">{e.objectId}</TableCell>
                    <TableCell>
                      <ResultBadge result={e.result} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <CardContent>
              <p className="text-body text-fg-muted">No high impact actions in this view.</p>
            </CardContent>
          )}
        </Card>
      </div>
    </AuditFilterBar>
  );
}
