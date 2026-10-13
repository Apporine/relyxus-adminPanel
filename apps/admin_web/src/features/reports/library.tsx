import { CalendarClock, Download, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { Field, FieldHint, Label, Select, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { reportFamilyLabel, reportQuery, runReport } from "@/domain/reports";
import type { ReportFamily, ReportFilter } from "@/domain/types";
import { formatDate, formatTimestamp, plural } from "@/lib/format";
import { loadReports } from "./load";
import { ReportTable } from "./report-table";

const families = Object.keys(reportFamilyLabel) as ReportFamily[];

export function describeFilter(filter: ReportFilter | undefined, label: string) {
  if (!filter) return "No filter";
  return "anyOf" in filter
    ? `${label} is ${filter.anyOf.join(" or ")}`
    : `${label} contains “${filter.contains}”`;
}

/** Report library by family (spec §26); each report opens its live result. */
export async function ReportLibrary() {
  const data = await loadReports();
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {families.map((family) => {
        const reports = data.reports.filter((r) => r.family === family);
        return (
          <Card key={family} aria-labelledby={`family-${family}`}>
            <CardHeader>
              <div>
                <CardTitle id={`family-${family}`}>{reportFamilyLabel[family]}</CardTitle>
                <CardDescription>{plural(reports.length, "report")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {reports.length ? (
                <ul className="flex flex-col gap-3">
                  {reports.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/analytics/reports/${r.id}`}
                        className="text-dense font-medium text-fg hover:text-violet-text hover:underline"
                      >
                        {r.title}
                      </Link>
                      <p className="text-micro text-fg-muted">{r.description}</p>
                      <p className="text-micro text-fg-muted">
                        {data.datasets[r.dataset].label} · {data.staffName(r.ownerId)} ·{" "}
                        {r.visibility === "team" ? "Team" : "Private"}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body text-fg-muted">No saved reports in this family.</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** One report: its definition and live result over the restricted dataset. */
export async function ReportView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadReports();
  const report = data.reportById[id];
  if (!report) notFound();
  const dataset = data.datasets[report.dataset];
  const result = runReport(dataset, reportQuery(report));
  const filterLabel = report.filter
    ? (dataset.fields.find((f) => f.key === report.filter!.field)?.label ?? report.filter.field)
    : "";
  const sortLabel = report.sort
    ? dataset.fields.find((f) => f.key === report.sort!.field)?.label
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Analytics", href: "/analytics" },
            { label: reportFamilyLabel[report.family], href: "/analytics" },
            { label: report.title },
          ]}
        />
        <PageHeader
          title={report.title}
          description={report.description}
          meta={
            <>
              <Tag>{dataset.label}</Tag>
              <Tag>{report.visibility === "team" ? "Team report" : "Private report"}</Tag>
              <span className="text-micro text-fg-muted">
                Owner {data.staffName(report.ownerId)} · updated {formatDate(report.updatedAt)}
              </span>
            </>
          }
          actions={
            <>
              <DesignPreviewDialog
                trigger="Schedule"
                triggerIcon={<CalendarClock aria-hidden="true" />}
                title="Schedule report"
                description="Scheduled reports go only to authorized recipients. Restricted fields are removed unless every recipient may see them."
                confirmLabel="Schedule report"
              >
                <Field>
                  <Label htmlFor="schedule-cadence">Cadence</Label>
                  <Select id="schedule-cadence" name="cadence" defaultValue="weekly">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </Select>
                </Field>
                <Field>
                  <Label htmlFor="schedule-recipients">Recipients</Label>
                  <Textarea id="schedule-recipients" name="recipients" required />
                  <FieldHint>Staff names or a team. External addresses are not allowed.</FieldHint>
                </Field>
              </DesignPreviewDialog>
              <DesignPreviewDialog
                trigger="Export"
                triggerVariant="primary"
                triggerIcon={<Download aria-hidden="true" />}
                title="Export report"
                description="Large exports run in the background as an audited export job with a time limited download. The export contains only fields you are authorized to view."
                confirmLabel="Queue export"
              >
                <p className="text-body text-fg-secondary">
                  {plural(result.rows.length, "row")}, {plural(result.columns.length, "column")}.
                </p>
                <Field>
                  <Label htmlFor="report-export-reason">Reason</Label>
                  <Textarea id="report-export-reason" name="reason" required />
                </Field>
              </DesignPreviewDialog>
            </>
          }
        />
      </div>

      <Card aria-labelledby="definition-title">
        <CardHeader>
          <CardTitle id="definition-title">Definition</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-8 gap-y-2 text-dense text-fg-secondary">
          <span>Filter: {describeFilter(report.filter, filterLabel)}</span>
          <span>
            Sort: {sortLabel ? `${sortLabel}, ${report.sort!.direction}` : "Dataset order"}
          </span>
          <span>Columns: {result.columns.map((c) => c.label).join(", ")}</span>
        </CardContent>
      </Card>

      {result.hidden.length ? (
        <Notice title={`${plural(result.hidden.length, "column")} hidden by your permissions`}>
          <span className="inline-flex items-center gap-1">
            <Lock aria-hidden="true" className="size-3.5" />
            {result.hidden
              .map((key) => dataset.locked.find((f) => f.key === key)?.label ?? key)
              .join(", ")}
            . The rows never include them, so exports do not either.
          </span>
        </Notice>
      ) : null}

      <ReportTable label={report.title} result={result} />
    </div>
  );
}

/** Saved views of module screens: filters, columns, sort and scope (spec §26). */
export async function SavedViews() {
  const data = await loadReports();
  const views = [...data.views].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <Card>
      <Table label="Saved views" className="whitespace-nowrap">
        <TableHead>
          <TableRow>
            <TableHeaderCell>View</TableHeaderCell>
            <TableHeaderCell>Module</TableHeaderCell>
            <TableHeaderCell>Filters</TableHeaderCell>
            <TableHeaderCell>Owner</TableHeaderCell>
            <TableHeaderCell>Shared with</TableHeaderCell>
            <TableHeaderCell>Updated</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {views.map((v) => (
            <TableRow key={v.id}>
              <TableCell>
                <Link
                  href={v.href}
                  className="font-medium text-fg hover:text-violet-text hover:underline"
                >
                  {v.name}
                </Link>
              </TableCell>
              <TableCell>{v.module}</TableCell>
              <TableCell className="text-fg-secondary">{v.summary}</TableCell>
              <TableCell>{data.staffName(v.ownerId)}</TableCell>
              <TableCell>{v.visibility === "team" ? "Team" : "Only the owner"}</TableCell>
              <TableCell>{formatDate(v.updatedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

const runTone = { delivered: "healthy", failed: "critical", skipped: "neutral" } as const;
const runLabel = { delivered: "Delivered", failed: "Failed", skipped: "Skipped" };

/** Scheduled reports with recipients, minimization and last delivery (spec §26). */
export async function ScheduledReports() {
  const data = await loadReports();
  return (
    <Card>
      <Table label="Scheduled reports" className="whitespace-nowrap">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Report</TableHeaderCell>
            <TableHeaderCell>Cadence</TableHeaderCell>
            <TableHeaderCell>Recipients</TableHeaderCell>
            <TableHeaderCell>Format</TableHeaderCell>
            <TableHeaderCell>Sensitive data</TableHeaderCell>
            <TableHeaderCell>Next run</TableHeaderCell>
            <TableHeaderCell>Last run</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.schedules.map((s) => {
            const report = data.reportById[s.reportId];
            return (
              <TableRow key={s.id}>
                <TableCell>
                  <Link
                    href={`/analytics/reports/${s.reportId}`}
                    className="font-medium text-fg hover:text-violet-text hover:underline"
                  >
                    {report?.title ?? s.reportId}
                  </Link>
                  {s.paused ? <Tag className="ms-2">Paused</Tag> : null}
                </TableCell>
                <TableCell>{s.cadence}</TableCell>
                <TableCell className="whitespace-normal">
                  {s.recipientIds.map(data.staffName).join(", ")}
                </TableCell>
                <TableCell>{s.format}</TableCell>
                <TableCell>{s.minimized ? "Minimized" : "Full fields"}</TableCell>
                <TableCell>{s.paused ? "—" : formatTimestamp(s.nextRunAt)}</TableCell>
                <TableCell className="whitespace-normal">
                  {s.lastRun ? (
                    <>
                      <StatusBadge
                        tone={runTone[s.lastRun.status]}
                        label={runLabel[s.lastRun.status]}
                      />
                      <span className="block text-micro text-fg-muted">
                        {formatTimestamp(s.lastRun.at)}
                        {s.lastRun.note ? ` · ${s.lastRun.note}` : ""}
                      </span>
                    </>
                  ) : (
                    "Never run"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
