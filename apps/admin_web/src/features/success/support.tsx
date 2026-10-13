import { Eye, LifeBuoy, Megaphone, Repeat, ShieldAlert, Timer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableId } from "@/components/ui/copyable-id";
import { DescriptionList } from "@/components/ui/description-list";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Field, Label, Textarea } from "@/components/ui/field";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import {
  firstResponseMinutes,
  formatMinutes,
  recurringIssues,
  severities,
  slaReport,
  supportPolicy,
} from "@/domain/success";
import type { SupportCase } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatPercent, formatRelativeTime, formatTimestamp, plural } from "@/lib/format";
import { getSupportCase } from "@/server/data";
import { loadSuccess, type SuccessData } from "./load";

const severityTone = { sev1: "critical", sev2: "risk", sev3: "neutral", sev4: "neutral" } as const;
const severityLabel = { sev1: "Sev 1", sev2: "Sev 2", sev3: "Sev 3", sev4: "Sev 4" };
const statusLabel = { open: "Open", pending_customer: "Pending customer", resolved: "Resolved" };
const slaTone = { within: "healthy", at_risk: "risk", breached: "critical" } as const;
const slaLabel = { within: "Within SLA", at_risk: "SLA at risk", breached: "SLA breached" };

function CaseTable({
  cases,
  data,
  label,
}: {
  cases: SupportCase[];
  data: SuccessData;
  label: string;
}) {
  return (
    <Table label={label} className="whitespace-nowrap">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Reference</TableHeaderCell>
          <TableHeaderCell>Customer</TableHeaderCell>
          <TableHeaderCell>Severity</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>SLA</TableHeaderCell>
          <TableHeaderCell>Owner</TableHeaderCell>
          <TableHeaderCell>Opened</TableHeaderCell>
          <TableHeaderCell>Source</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {cases.map((c) => (
          <TableRow key={c.id}>
            <TableCell>
              <Link
                href={`/success/support/cases/${c.id}`}
                className="font-mono font-semibold text-fg hover:text-violet-text hover:underline"
              >
                {c.externalRef}
              </Link>
              <span className="block max-w-72 truncate text-micro text-fg-muted">{c.title}</span>
            </TableCell>
            <TableCell>{data.customerById[c.customerId]?.displayName}</TableCell>
            <TableCell>
              <StatusBadge tone={severityTone[c.severity]} label={severityLabel[c.severity]} />
            </TableCell>
            <TableCell>
              {statusLabel[c.status]}
              {c.escalation ? (
                <Tag className="ms-2 bg-coral-subtle text-coral-text">
                  Escalated L{c.escalation.level}
                </Tag>
              ) : null}
            </TableCell>
            <TableCell>
              <StatusBadge tone={slaTone[c.slaState]} label={slaLabel[c.slaState]} />
            </TableCell>
            <TableCell>{data.staff[c.ownerId]?.name}</TableCell>
            <TableCell>{formatRelativeTime(c.openedAt, data.now)}</TableCell>
            <TableCell className="text-fg-muted">{c.sourceSystem ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Support overview (spec §20): case references only; full content stays in the support
 * platform. Escalations and recurring issues sit beside the open cases.
 */
export async function SupportOverview() {
  const data = await loadSuccess();
  const open = data.cases
    .filter((c) => c.status !== "resolved")
    .sort((a, b) => a.severity.localeCompare(b.severity) || a.openedAt.localeCompare(b.openedAt));
  const escalated = open.filter((c) => c.escalation);
  const recurring = recurringIssues(data.cases);

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="Support summary"
        className="grid stagger grid-cols-2 gap-4 xl:grid-cols-4"
      >
        <MetricCard
          label="Open cases"
          value={String(open.length)}
          detail={`${open.filter((c) => c.severity === "sev1" || c.severity === "sev2").length} Sev 1 or 2`}
          href="/success/support"
          source="Support platform references"
          icon={<LifeBuoy />}
        />
        <MetricCard
          label="SLA concerns"
          value={String(open.filter((c) => c.slaState !== "within").length)}
          detail="At risk or breached"
          href="/success/support/sla"
          source="SLA state from the support platform"
          icon={<Timer />}
        />
        <MetricCard
          label="Escalations"
          value={String(escalated.length)}
          detail={`${escalated.filter((c) => c.escalation?.executiveVisible).length} with executive visibility`}
          href="/success/support"
          source="Escalation records"
          icon={<Megaphone />}
        />
        <MetricCard
          label="Recurring patterns"
          value={String(recurring.length)}
          detail="Same issue across customers"
          href="/success/support"
          source="Grouped case titles"
          icon={<Repeat />}
        />
      </section>

      {escalated.length ? (
        <section aria-labelledby="escalations-title">
          <h2 id="escalations-title" className="mb-3 text-section-title text-fg">
            Active escalations
          </h2>
          <ul className="grid stagger gap-3 lg:grid-cols-2">
            {escalated.map((c) => (
              <li
                key={c.id}
                className="relative rounded-card border border-s-[3px] border-border border-s-coral bg-surface p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-fg">
                    <Link
                      href={`/success/support/cases/${c.id}`}
                      className="after:absolute after:inset-0 hover:text-violet-text"
                    >
                      {data.customerById[c.customerId]?.displayName}: {c.title}
                    </Link>
                  </p>
                  <Tag className="shrink-0 bg-coral-subtle text-coral-text">
                    Level {c.escalation!.level}
                  </Tag>
                </div>
                <p className="mt-1 text-dense text-fg-secondary">{c.escalation!.businessContext}</p>
                <p className="mt-2 text-micro text-fg-muted">
                  Updates {c.escalation!.cadence.toLowerCase()} · next{" "}
                  {formatTimestamp(c.escalation!.nextUpdateAt)}
                  {c.escalation!.executiveVisible ? " · executive visibility" : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Card aria-labelledby="cases-title">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="cases-title" className="text-card-title">
            Case references
          </h2>
          <p className="text-dense text-fg-muted tabular">{plural(data.cases.length, "case")}</p>
        </div>
        <CaseTable
          cases={[...open, ...data.cases.filter((c) => c.status === "resolved")]}
          data={data}
          label="Case references"
        />
      </Card>

      <Card aria-labelledby="recurring-title">
        <CardHeader>
          <div>
            <CardTitle id="recurring-title">Recurring issues</CardTitle>
            <CardDescription>
              Grouped by product and issue title across customers and releases. No case content is
              copied.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {recurring.length ? (
            <ul className="flex flex-col gap-3">
              {recurring.map((issue) => (
                <li key={issue.title} className="rounded-control border border-border p-3">
                  <p className="font-medium text-fg">{issue.title}</p>
                  <p className="mt-1 text-dense text-fg-secondary">
                    {plural(issue.caseIds.length, "case")} ·{" "}
                    {plural(issue.customerIds.length, "customer")} · releases{" "}
                    {issue.releases.join(", ")}
                  </p>
                  <p className="mt-1 text-micro text-fg-muted">
                    {issue.customerIds.map((id) => data.customerById[id]?.displayName).join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-fg-muted">No recurring issues.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Case reference and, when escalated, the escalation workspace (spec §20). */
export async function SupportCaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supportCase = await getSupportCase(id);
  if (!supportCase) notFound();
  const data = await loadSuccess();
  const c = supportCase;
  const customer = data.customerById[c.customerId];
  const policy = customer ? supportPolicy[customer.supportTier] : undefined;
  const response = firstResponseMinutes(c);
  const objective = policy?.responseMinutes[c.severity];
  const e = c.escalation;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Success", href: "/success" },
            { label: "Support", href: "/success/support" },
            { label: c.externalRef },
          ]}
        />
        <PageHeader
          title={c.title}
          description={`${customer?.displayName ?? c.customerId} · ${c.sourceSystem ?? "Support platform"} ${c.externalRef}`}
          meta={
            <>
              <CopyableId value={c.externalRef} label="Case reference" />
              <StatusBadge tone={severityTone[c.severity]} label={severityLabel[c.severity]} />
              <StatusBadge tone={slaTone[c.slaState]} label={slaLabel[c.slaState]} />
              {e ? (
                <Tag className="bg-coral-subtle text-coral-text">Escalation level {e.level}</Tag>
              ) : null}
            </>
          }
          actions={
            e ? (
              <DesignPreviewDialog
                trigger="Post update"
                triggerVariant="primary"
                triggerIcon={<Megaphone aria-hidden="true" />}
                title="Post escalation update"
                description={`Record the update sent to ${customer?.displayName ?? "the customer"}. Keep restricted incident detail in the support platform.`}
                confirmLabel="Post update"
              >
                <Field>
                  <Label htmlFor="escalation-note">Update</Label>
                  <Textarea id="escalation-note" name="note" required />
                </Field>
              </DesignPreviewDialog>
            ) : undefined
          }
        />
      </div>

      <Notice title="Reference only">
        Full case content stays in {c.sourceSystem ?? "the support platform"}. This record holds the
        reference, severity, status, owner, times and SLA state.
      </Notice>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 stagger flex-col gap-4">
          <Card aria-labelledby="case-facts">
            <CardHeader>
              <CardTitle id="case-facts">Case</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList
                columns={2}
                items={[
                  { term: "Status", value: statusLabel[c.status] },
                  { term: "Owner", value: data.staff[c.ownerId]?.name },
                  { term: "Opened", value: formatTimestamp(c.openedAt) },
                  {
                    term: "Resolved",
                    value: c.resolvedAt ? formatTimestamp(c.resolvedAt) : undefined,
                  },
                  {
                    term: "First response",
                    value:
                      response !== undefined
                        ? `${formatMinutes(response)}${objective ? ` (objective ${formatMinutes(objective)})` : ""}`
                        : undefined,
                  },
                  { term: "Release", value: c.releaseVersion },
                  {
                    term: "Product",
                    value: c.productId ? data.productNames[c.productId] : undefined,
                  },
                  { term: "Source system", value: c.sourceSystem },
                ]}
              />
            </CardContent>
          </Card>

          {e ? (
            <Card aria-labelledby="escalation-title">
              <CardHeader>
                <div>
                  <CardTitle id="escalation-title">Escalation workspace</CardTitle>
                  <CardDescription>{e.businessContext}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <DescriptionList
                  columns={2}
                  items={[
                    { term: "Escalated", value: formatTimestamp(e.openedAt) },
                    { term: "Communication cadence", value: e.cadence },
                    { term: "Next update due", value: formatTimestamp(e.nextUpdateAt) },
                    {
                      term: "Executive visibility",
                      value: e.executiveVisible ? "Yes" : "No",
                    },
                    {
                      term: "Active owners",
                      value: e.ownerIds.map((o) => data.staff[o]?.name).join(", "),
                    },
                  ]}
                />
                <ol className="relative flex flex-col gap-3 before:absolute before:inset-y-1 before:start-[5px] before:w-px before:bg-border">
                  {[...e.updates].reverse().map((u) => (
                    <li key={u.at} className="relative flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 size-[11px] shrink-0 rounded-full bg-violet ring-4 ring-surface"
                      />
                      <div>
                        <p className="text-body text-fg">{u.note}</p>
                        <p className="text-micro text-fg-muted">
                          {data.staff[u.byId]?.name} · {formatTimestamp(u.at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside aria-label="Support entitlement" className="flex flex-col gap-4">
          {policy ? (
            <Card aria-labelledby="entitlement-title">
              <CardHeader>
                <CardTitle id="entitlement-title">Support entitlement</CardTitle>
                <Tag>{policy.label}</Tag>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <DescriptionList
                  items={[
                    { term: "Hours", value: policy.hours },
                    { term: "Channels", value: policy.channels.join(", ") },
                    {
                      term: `${severityLabel[c.severity]} response objective`,
                      value: objective ? formatMinutes(objective) : undefined,
                    },
                  ]}
                />
                <div>
                  <p className="text-micro text-fg-muted">Escalation path</p>
                  <ol className="mt-1 flex flex-col gap-1 text-dense text-fg">
                    {policy.escalationPath.map((step, i) => (
                      <li key={step} className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex size-5 items-center justify-center rounded-full text-micro tabular",
                            e && i < e.level
                              ? "bg-violet text-white"
                              : "bg-surface-sunken text-fg-secondary",
                          )}
                        >
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          ) : null}
          {e?.executiveVisible ? (
            <Notice tone="risk" title="Executive visibility">
              <span className="inline-flex items-center gap-1.5">
                <Eye aria-hidden="true" className="size-3.5" />
                Executives on both sides follow this escalation.
              </span>
            </Notice>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/** SLA report (spec §20, §26): volume, breaches, compliance and first response by severity. */
export async function SlaReport() {
  const data = await loadSuccess();
  const report = slaReport(data.cases);
  if (data.cases.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No cases yet"
        body="SLA reporting starts with the first support case reference."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Table label="SLA by severity">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Severity</TableHeaderCell>
              <TableHeaderCell className="text-end">Cases</TableHeaderCell>
              <TableHeaderCell className="text-end">Open</TableHeaderCell>
              <TableHeaderCell className="text-end">At risk</TableHeaderCell>
              <TableHeaderCell className="text-end">Breached</TableHeaderCell>
              <TableHeaderCell>Compliance</TableHeaderCell>
              <TableHeaderCell className="text-end">Median first response</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {report.map((row) => (
              <TableRow key={row.severity}>
                <TableCell>
                  <StatusBadge
                    tone={severityTone[row.severity]}
                    label={severityLabel[row.severity]}
                  />
                </TableCell>
                <TableCell className="text-end tabular">{row.total}</TableCell>
                <TableCell className="text-end tabular">{row.open}</TableCell>
                <TableCell className="text-end tabular">{row.atRisk}</TableCell>
                <TableCell
                  className={cn(
                    "text-end tabular",
                    row.breached && "font-semibold text-coral-text",
                  )}
                >
                  {row.breached}
                </TableCell>
                <TableCell>
                  {row.compliance === undefined ? (
                    <span className="text-fg-muted">No cases</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="w-12 font-medium text-fg tabular">
                        {formatPercent(row.compliance)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-sunken"
                      >
                        <span
                          className={cn(
                            "block h-full chart-grow-x rounded-full",
                            row.compliance < 0.9 ? "bg-chart-critical" : "bg-chart-healthy",
                          )}
                          style={{ width: `${row.compliance * 100}%` }}
                        />
                      </span>
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-end tabular">
                  {row.medianFirstResponseMinutes === undefined
                    ? "—"
                    : formatMinutes(row.medianFirstResponseMinutes)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card aria-labelledby="objectives-title">
        <CardHeader>
          <div>
            <CardTitle id="objectives-title">Response objectives by support tier</CardTitle>
            <CardDescription>From each contract&apos;s support entitlement.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table label="Response objectives">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Tier</TableHeaderCell>
                <TableHeaderCell>Hours</TableHeaderCell>
                {severities.map((s) => (
                  <TableHeaderCell key={s} className="text-end">
                    {severityLabel[s]}
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.values(supportPolicy).map((p) => (
                <TableRow key={p.label}>
                  <TableCell className="font-medium text-fg">{p.label}</TableCell>
                  <TableCell>{p.hours}</TableCell>
                  {severities.map((s) => (
                    <TableCell key={s} className="text-end tabular">
                      {formatMinutes(p.responseMinutes[s])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
