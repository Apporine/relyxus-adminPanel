import { KeyRound, ListChecks, ShieldAlert, UserCog } from "lucide-react";
import Link from "next/link";
import { ChartTable } from "@/components/charts/chart-table";
import { LineChart } from "@/components/charts/line-chart";
import { BarList } from "@/components/charts/simple-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { MetricCard } from "@/components/ui/metric-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import {
  activeSigningKey,
  breakGlassState,
  credentialAgeDays,
  effectiveRoles,
  findingCategory,
  isPrivileged,
  reviewProgress,
  reviewStatus,
  rotationStatus,
} from "@/domain/security";
import { formatDate, formatPercent, formatRelativeDays, plural } from "@/lib/format";
import { loadSecurity } from "./load";
import {
  breakGlassLabel,
  KeyTimeline,
  postureLabel,
  Progress,
  reviewStatusLabel,
  severityLabel,
  Status,
} from "./security-parts";

const weekLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(iso),
  );

/**
 * Security posture (spec §23, §30): the most important control plane access risks first,
 * with access reviews, API credential age, break glass activity and the key timeline.
 */
export async function SecurityPosture() {
  const data = await loadSecurity();
  const { now, findings } = data;
  const high = findings.filter((f) => f.severity === "high");
  const privileged = data.staff.filter((s) =>
    isPrivileged(effectiveRoles(s, data.accessById[s.id], now)),
  );
  const openReviews = data.reviews.filter((r) => reviewStatus(r, now) !== "closed");
  const overdueReviews = openReviews.filter((r) => reviewStatus(r, now) === "overdue");
  const activeKey = activeSigningKey(data.keys);
  const rotation = rotationStatus(data.keys, now);
  const activeClients = data.clients
    .filter((c) => c.state === "active")
    .sort((a, b) => credentialAgeDays(b, now) - credentialAgeDays(a, now));
  const recentBreakGlass = [...data.breakGlass]
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    .slice(0, 4);
  const posture = postureLabel[data.posture];

  return (
    <div className="flex flex-col gap-6">
      <Notice
        tone={data.posture === "healthy" ? "info" : "risk"}
        title={`Security posture: ${posture.label}`}
      >
        {findings.length
          ? `${plural(findings.length, "open finding")}, ${high.length} high severity. Calculated ${formatDate(now)}.`
          : "No open findings."}
      </Notice>

      <section
        aria-label="Security summary"
        className="grid stagger grid-cols-2 gap-4 xl:grid-cols-4"
      >
        <MetricCard
          label="High severity findings"
          value={String(high.length)}
          detail={`${plural(findings.length, "finding")} in total`}
          href="#security-risks"
          source="Security findings from staff, review, client and key records"
          icon={<ShieldAlert />}
        />
        <MetricCard
          label="Privileged staff"
          value={String(privileged.length)}
          detail={`of ${plural(data.staff.length, "staff account")}`}
          href="/security/staff"
          source="Staff with license, key, access or infrastructure roles"
          icon={<UserCog />}
        />
        <MetricCard
          label="Open access reviews"
          value={String(openReviews.length)}
          detail={overdueReviews.length ? `${overdueReviews.length} overdue` : "None overdue"}
          href="/security/access-reviews"
          source="Access review campaigns not yet closed"
          icon={<ListChecks />}
        />
        <MetricCard
          label="Next key rotation"
          value={activeKey?.nextRotationAt ? formatDate(activeKey.nextRotationAt) : "Not planned"}
          detail={
            activeKey?.nextRotationAt
              ? `${activeKey.id} · ${formatRelativeDays(activeKey.nextRotationAt, now)}${rotation === "due" || rotation === "overdue" ? " · due" : ""}`
              : undefined
          }
          href="/security/signing-keys"
          source="Active license signing key metadata"
          icon={<KeyRound />}
        />
      </section>

      <Card id="security-risks" aria-labelledby="risks-title" className="scroll-mt-20">
        <CardHeader>
          <div>
            <CardTitle id="risks-title">Security risks</CardTitle>
            <CardDescription>Most severe first. Each finding links to its record.</CardDescription>
          </div>
        </CardHeader>
        <Table label="Security risks">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Severity</TableHeaderCell>
              <TableHeaderCell>Area</TableHeaderCell>
              <TableHeaderCell>Finding</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {findings.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <Status value={severityLabel[f.severity]} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-fg-secondary">
                  {findingCategory[f.kind]}
                </TableCell>
                <TableCell className="min-w-80">
                  <Link
                    href={f.href}
                    className="font-medium text-fg hover:text-violet-text hover:underline"
                  >
                    {f.title}
                  </Link>
                  <span className="block text-micro text-fg-muted">{f.detail}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card aria-labelledby="trend-title">
          <CardHeader>
            <div>
              <CardTitle id="trend-title">Risk trend</CardTitle>
              <CardDescription>Open findings and failed admin sign ins per week.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <LineChart
              label="Open security findings and failed admin sign ins per week"
              xLabels={data.signals.map((w) => weekLabel(w.week))}
              format="number"
              series={[
                {
                  key: "findings",
                  label: "Open findings",
                  color: "var(--ap-chart-primary)",
                  values: data.signals.map((w) => w.openFindings),
                },
                {
                  key: "auth",
                  label: "Failed sign ins",
                  color: "var(--ap-chart-risk)",
                  values: data.signals.map((w) => w.failedAdminAuth),
                },
              ]}
            />
            <ChartTable
              caption="Security signals per week"
              columns={["Week of", "Open findings", "Failed sign ins", "Revoke requests"]}
              rows={data.signals.map((w) => [
                weekLabel(w.week),
                w.openFindings,
                w.failedAdminAuth,
                w.revokeRequests,
              ])}
            />
          </CardContent>
        </Card>

        <Card aria-labelledby="completion-title">
          <CardHeader>
            <div>
              <CardTitle id="completion-title">Access review completion</CardTitle>
              <CardDescription>Decisions made by the due date, per quarter.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <BarList
              max={1}
              items={data.completion.map((q) => ({
                key: q.quarter,
                label: q.quarter,
                value: q.onTime,
                valueLabel: formatPercent(q.onTime),
                href: "/security/access-reviews",
                risk: q.onTime < 0.8,
                accessibleLabel: `${q.quarter}: ${formatPercent(q.onTime)} completed on time`,
              }))}
            />
            <ul className="flex flex-col gap-2 border-t border-border pt-3">
              {openReviews.map((r) => {
                const p = reviewProgress(r);
                const status = reviewStatus(r, now);
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/security/access-reviews/${r.id}`}
                      className="text-dense font-medium text-fg hover:text-violet-text hover:underline"
                    >
                      {r.title}
                    </Link>
                    <span className="flex items-center gap-2">
                      <Progress
                        done={p.decided}
                        total={p.total}
                        label="decided"
                        risk={status === "overdue"}
                      />
                      <Status value={reviewStatusLabel[status]} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card aria-labelledby="client-age-title">
          <CardHeader>
            <div>
              <CardTitle id="client-age-title">API client credential age</CardTitle>
              <CardDescription>Active clients, oldest credential first.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BarList
              items={activeClients.map((c) => {
                const age = credentialAgeDays(c, now);
                return {
                  key: c.id,
                  label: c.name,
                  value: age,
                  valueLabel: `${age} days`,
                  href: "/security/api-clients",
                  risk: Date.parse(c.rotationDueAt) < Date.parse(now),
                  note: `due ${formatDate(c.rotationDueAt)}`,
                  accessibleLabel: `${c.name}: credential ${age} days old, rotation due ${formatDate(c.rotationDueAt)}`,
                };
              })}
            />
          </CardContent>
        </Card>

        <Card aria-labelledby="bg-title">
          <CardHeader>
            <div>
              <CardTitle id="bg-title">Break glass activity</CardTitle>
              <CardDescription>Latest emergency access requests.</CardDescription>
            </div>
            <Link
              href="/security/break-glass"
              className="text-dense font-medium text-violet-text hover:underline"
            >
              Open register
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {recentBreakGlass.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-dense font-medium text-fg">
                      {data.directory[a.staffId]?.name} · {a.incidentRef}
                    </span>
                    <span className="block text-micro text-fg-muted">
                      {a.scope} · {formatDate(a.requestedAt)}
                    </span>
                  </span>
                  <Status value={breakGlassLabel[breakGlassState(a, now)]} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card aria-labelledby="key-timeline-title">
          <CardHeader>
            <div>
              <CardTitle id="key-timeline-title">Signing key timeline</CardTitle>
              <CardDescription>Signing periods, overlap and planned rotation.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <KeyTimeline keys={data.keys} now={now} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
