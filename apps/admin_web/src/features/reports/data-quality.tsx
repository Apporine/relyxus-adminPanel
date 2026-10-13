import { CircleCheck, GitMerge } from "lucide-react";
import Link from "next/link";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { Field, Label, Textarea } from "@/components/ui/field";
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
  checkLabel,
  completeness,
  dataQualityIssues,
  duplicateSuggestions,
  type DataQualityCheck,
} from "@/domain/data-quality";
import { lifecycleStage } from "@/domain/status";
import { cn } from "@/lib/cn";
import { formatPercent, formatTimestamp } from "@/lib/format";
import {
  getCrmSyncStatus,
  getFinanceInputs,
  getGovernance,
  getReferenceTime,
  listContacts,
  listContracts,
  listCustomerEntitlements,
  listCustomers,
  listDeployments,
  listLicenses,
} from "@/server/data";

const checks = Object.keys(checkLabel) as DataQualityCheck[];
const STALE_AFTER_HOURS = 24;

async function loadDataQuality() {
  const [
    now,
    customers,
    contacts,
    contracts,
    licenses,
    deployments,
    entitlements,
    governance,
    crm,
    finance,
  ] = await Promise.all([
    getReferenceTime(),
    listCustomers(),
    listContacts(),
    listContracts(),
    listLicenses(),
    listDeployments(),
    listCustomerEntitlements(),
    getGovernance(),
    getCrmSyncStatus(),
    getFinanceInputs(),
  ]);
  const source = (id: string) => finance.sources.find((s) => s.id === id)!;
  const syncs = [
    { system: crm.system, lastSyncedAt: crm.lastSyncedAt, staleAfterHours: STALE_AFTER_HOURS },
    {
      system: source("finance").system,
      lastSyncedAt: source("finance").lastSyncedAt,
      staleAfterHours: STALE_AFTER_HOURS,
    },
    {
      system: source("support_time").system,
      lastSyncedAt: source("support_time").lastSyncedAt,
      staleAfterHours: STALE_AFTER_HOURS,
    },
  ];
  const issues = dataQualityIssues({
    now,
    customers,
    contacts,
    contracts,
    licenses,
    deployments,
    entitlements,
    incoming: governance.incoming,
    syncs,
  });
  const scores = customers
    .map((c) => ({ customer: c, ...completeness(c, { contacts, contracts }) }))
    .sort((a, b) => a.score - b.score);
  return {
    now,
    customers,
    issues,
    scores,
    syncs,
    governance,
    duplicates: duplicateSuggestions(customers, governance.incoming),
    customerName: Object.fromEntries(customers.map((c) => [c.id, c.displayName])) as Record<
      string,
      string
    >,
  };
}

/**
 * Data quality center (spec §27): actionable checks, explainable completeness, duplicate
 * suggestions that never merge automatically, source ownership, classification and
 * retention.
 */
export async function DataQualityCenter() {
  const data = await loadDataQuality();
  const average = data.scores.reduce((s, r) => s + r.score, 0) / data.scores.length;
  const stale = data.syncs.filter(
    (s) => (Date.parse(data.now) - Date.parse(s.lastSyncedAt)) / 3_600_000 > s.staleAfterHours,
  );

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="Data quality summary"
        className="grid stagger grid-cols-2 gap-4 xl:grid-cols-4"
      >
        <MetricCard
          label="Open issues"
          value={String(data.issues.length)}
          detail={`${checks.filter((c) => data.issues.some((i) => i.check === c)).length} of ${checks.length} checks need attention`}
          href="#checks"
          source="Data quality checks over current records"
        />
        <MetricCard
          label="Average completeness"
          value={formatPercent(average / 100)}
          detail="Required fields by lifecycle stage"
          href="#completeness"
          source="Customer, owner, contact and contract fields"
        />
        <MetricCard
          label="Possible duplicates"
          value={String(data.duplicates.length)}
          detail="Suggestions only; nothing merges automatically"
          href="#duplicates"
          source="Name match across customers and incoming CRM records"
        />
        <MetricCard
          label="Stale sources"
          value={String(stale.length)}
          detail={stale.map((s) => s.system).join(", ") || "All sources current"}
          href="#sources"
          source={`Last sync older than ${STALE_AFTER_HOURS} hours`}
        />
      </section>

      <Card id="checks" aria-labelledby="checks-title" className="scroll-mt-20">
        <CardHeader>
          <div>
            <CardTitle id="checks-title">Checks</CardTitle>
            <CardDescription>
              Every check runs on current records; each issue links to its record.
            </CardDescription>
          </div>
        </CardHeader>
        <Table label="Data quality issues">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Check</TableHeaderCell>
              <TableHeaderCell className="text-end">Open</TableHeaderCell>
              <TableHeaderCell>Records</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {checks.map((check) => {
              const found = data.issues.filter((i) => i.check === check);
              return (
                <TableRow key={check}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {checkLabel[check]}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-end tabular",
                      found.length && "font-semibold text-coral-text",
                    )}
                  >
                    {found.length}
                  </TableCell>
                  <TableCell>
                    {found.length ? (
                      <ul className="flex flex-col gap-1">
                        {found.map((i) => (
                          <li key={i.id} className="text-dense">
                            <Link
                              href={i.href}
                              className="inline-flex min-h-6 items-center font-medium text-fg hover:text-violet-text hover:underline"
                            >
                              {i.customerId ? data.customerName[i.customerId] : i.recordId}
                            </Link>{" "}
                            <span className="text-fg-muted">{i.detail}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-dense text-cyan-text">
                        <CircleCheck aria-hidden="true" className="size-3.5" />
                        No issues
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card id="duplicates" aria-labelledby="duplicates-title" className="scroll-mt-20">
        <CardHeader>
          <div>
            <CardTitle id="duplicates-title">Duplicate suggestions</CardTitle>
            <CardDescription>
              Customers, contracts and licenses are never merged automatically. A reviewer decides,
              and the merge is recorded in audit.
            </CardDescription>
          </div>
        </CardHeader>
        {data.duplicates.length ? (
          <Table label="Duplicate suggestions" className="whitespace-nowrap">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Record</TableHeaderCell>
                <TableHeaderCell>Possible duplicate</TableHeaderCell>
                <TableHeaderCell>Why</TableHeaderCell>
                <TableHeaderCell>
                  <span className="sr-only">Action</span>
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.duplicates.map((d) => (
                <TableRow key={`${d.a.id}-${d.b.id ?? d.b.source}`}>
                  <TableCell>
                    <Link
                      href={`/customers/${d.a.id}`}
                      className="font-medium text-fg hover:text-violet-text hover:underline"
                    >
                      {d.a.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {d.b.id ? (
                      <Link
                        href={`/customers/${d.b.id}`}
                        className="font-medium text-fg hover:text-violet-text hover:underline"
                      >
                        {d.b.name}
                      </Link>
                    ) : (
                      d.b.name
                    )}
                    <span className="block text-micro text-fg-muted">{d.b.source}</span>
                  </TableCell>
                  <TableCell className="whitespace-normal text-fg-secondary">{d.reason}</TableCell>
                  <TableCell>
                    <DesignPreviewDialog
                      trigger="Review"
                      triggerSize="sm"
                      triggerIcon={<GitMerge aria-hidden="true" />}
                      title="Review possible duplicate"
                      description="Choose to link the accounts as parent and child, merge them, or mark them as distinct. Merges need a second approver."
                      confirmLabel="Record decision"
                    >
                      <Field>
                        <Label htmlFor={`dup-${d.a.id}-${d.b.id ?? "crm"}`}>
                          Decision and reason
                        </Label>
                        <Textarea id={`dup-${d.a.id}-${d.b.id ?? "crm"}`} name="reason" required />
                      </Field>
                    </DesignPreviewDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <CardContent>
            <p className="text-body text-fg-muted">No likely duplicates.</p>
          </CardContent>
        )}
      </Card>

      <Card id="completeness" aria-labelledby="completeness-title" className="scroll-mt-20">
        <CardHeader>
          <div>
            <CardTitle id="completeness-title">Record completeness</CardTitle>
            <CardDescription>
              Required fields depend on lifecycle stage. The missing fields are the explanation; the
              score only summarizes them.
            </CardDescription>
          </div>
        </CardHeader>
        <Table label="Record completeness" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Stage</TableHeaderCell>
              <TableHeaderCell className="text-end">Score</TableHeaderCell>
              <TableHeaderCell>Missing</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.scores.map((r) => {
              const missing = r.fields.filter((f) => !f.present);
              return (
                <TableRow key={r.customer.id}>
                  <TableCell>
                    <Link
                      href={`/customers/${r.customer.id}`}
                      className="font-medium text-fg hover:text-violet-text hover:underline"
                    >
                      {r.customer.displayName}
                    </Link>
                  </TableCell>
                  <TableCell>{lifecycleStage[r.customer.lifecycleStage]}</TableCell>
                  <TableCell className="text-end tabular">
                    {r.score}%
                    <span className="block text-micro text-fg-muted">
                      {r.fields.length - missing.length} of {r.fields.length}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {missing.length ? (
                      <span className="flex flex-wrap gap-1">
                        {missing.map((f) => (
                          <Tag key={f.field}>{f.field}</Tag>
                        ))}
                      </span>
                    ) : (
                      <span className="text-fg-muted">Complete</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card id="sources" aria-labelledby="ownership-title" className="scroll-mt-20">
        <CardHeader>
          <div>
            <CardTitle id="ownership-title">Source ownership</CardTitle>
            <CardDescription>
              A field controlled by the CRM or finance system is not overwritten here.
            </CardDescription>
          </div>
        </CardHeader>
        <Table label="Source ownership">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Fields</TableHeaderCell>
              <TableHeaderCell>Object</TableHeaderCell>
              <TableHeaderCell>Owned by</TableHeaderCell>
              <TableHeaderCell>Rule</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.governance.ownership.map((o) => {
              const sync = data.syncs.find((s) => o.system.startsWith(s.system.split(" ")[0]!));
              const isStale = sync ? stale.includes(sync) : false;
              return (
                <TableRow key={o.field}>
                  <TableCell className="font-medium">{o.field}</TableCell>
                  <TableCell>{o.object}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {o.system}
                    {sync ? (
                      <span className="block">
                        <StatusBadge
                          tone={isStale ? "risk" : "healthy"}
                          label={
                            isStale
                              ? `Stale since ${formatTimestamp(sync.lastSyncedAt)}`
                              : "Current"
                          }
                        />
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-fg-secondary">{o.rule}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card aria-labelledby="classification-title">
          <CardHeader>
            <CardTitle id="classification-title">Data classification</CardTitle>
          </CardHeader>
          <Table label="Data classification">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Fields</TableHeaderCell>
                <TableHeaderCell>Object</TableHeaderCell>
                <TableHeaderCell>Label</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.governance.classifications.map((c) => (
                <TableRow key={c.field}>
                  <TableCell>{c.field}</TableCell>
                  <TableCell>{c.object}</TableCell>
                  <TableCell>
                    <StatusBadge
                      tone={
                        c.label === "Restricted"
                          ? "risk"
                          : c.label === "Confidential"
                            ? "info"
                            : "neutral"
                      }
                      label={c.label}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card aria-labelledby="retention-title">
          <CardHeader>
            <CardTitle id="retention-title">Retention</CardTitle>
          </CardHeader>
          <Table label="Retention rules">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Record</TableHeaderCell>
                <TableHeaderCell>Kept for</TableHeaderCell>
                <TableHeaderCell>Basis</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.governance.retention.map((r) => (
                <TableRow key={r.record}>
                  <TableCell className="font-medium">{r.record}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.period}</TableCell>
                  <TableCell className="text-fg-secondary">{r.basis}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
      <Notice title="Policy values are illustrative">
        Retention periods and classification labels are policy configuration; legal and security
        confirm them before production (spec §43).
      </Notice>
    </div>
  );
}
