import { Bookmark, Download, Lock, Radio, SearchX } from "lucide-react";
import Link from "next/link";
import { StackedColumns } from "@/components/charts/stacked-columns";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyableId } from "@/components/ui/copyable-id";
import { DescriptionList } from "@/components/ui/description-list";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Field, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import {
  auditCategory,
  auditCategoryLabel,
  canViewChanges,
  correlatedEvents,
} from "@/domain/audit";
import { deploymentEnvironment } from "@/domain/status";
import type { AuditEvent } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatNumber, formatPercent, formatTimestamp, plural } from "@/lib/format";
import { AuditFilterBar, auditQuery, ResultBadge } from "./audit-parts";
import { EventDrawer } from "./event-drawer";
import { loadAudit, type AuditData } from "./load";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 50;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** Page actions: export the current view, save it, and stream settings (spec §30). */
export async function AuditActions({ searchParams }: { searchParams: SearchParams }) {
  const data = await loadAudit(await searchParams);
  return (
    <>
      <DesignPreviewDialog
        trigger="Save view"
        triggerIcon={<Bookmark aria-hidden="true" />}
        title="Save audit view"
        description="Save the current filters as a named view. Saved views show only events your role can see."
        confirmLabel="Save view"
      >
        <Field>
          <Label htmlFor="view-name">Name</Label>
          <Input id="view-name" name="name" required />
        </Field>
      </DesignPreviewDialog>
      <DesignPreviewDialog
        trigger="Stream settings"
        triggerIcon={<Radio aria-hidden="true" />}
        title="Audit stream settings"
        description="Audit events are written to the log first, then delivered to the SIEM. Changing the destination is a security policy change and needs approval."
        confirmLabel="Request change"
      >
        <Field>
          <Label htmlFor="stream-destination">Destination</Label>
          <Input
            id="stream-destination"
            name="destination"
            defaultValue={data.stream.destination}
            required
          />
        </Field>
        <Field>
          <Label htmlFor="stream-reason">Reason</Label>
          <Textarea id="stream-reason" name="reason" required />
        </Field>
      </DesignPreviewDialog>
      <DesignPreviewDialog
        trigger="Export audit"
        triggerVariant="primary"
        triggerIcon={<Download aria-hidden="true" />}
        title="Export audit events"
        description="The export contains only fields you are authorized to view. The export event is recorded in audit."
        confirmLabel="Queue export"
      >
        <p className="text-body text-fg-secondary">
          {plural(data.filtered.length, "event")} match the current filters.
        </p>
        <Field>
          <Label htmlFor="export-format">Format</Label>
          <Select id="export-format" name="format" defaultValue="csv">
            <option value="csv">CSV</option>
            <option value="jsonl">JSON Lines</option>
          </Select>
          <FieldHint>A signed manifest with a SHA-256 digest is stored with the export.</FieldHint>
        </Field>
        <Field>
          <Label htmlFor="export-reason">Reason</Label>
          <Textarea id="export-reason" name="reason" required />
        </Field>
      </DesignPreviewDialog>
    </>
  );
}

function StreamNotice({ data }: { data: AuditData }) {
  if (data.stream.state === "healthy") return null;
  return (
    <Notice tone="risk" title={`Stream ${data.stream.state}: ${data.stream.destination}`}>
      Last delivery acknowledged {formatTimestamp(data.stream.lastDeliveredAt)};{" "}
      {plural(data.stream.backlog, "event")} waiting. Events are safe in the audit log and are
      delivered when the stream recovers.
    </Notice>
  );
}

/** Analytics summary above the table; computed from the same filtered events. */
function AuditSummary({ data }: { data: AuditData }) {
  const a = data.analytics;
  const tiles = [
    { label: "Events", value: formatNumber(a.total) },
    { label: "Failure rate", value: formatPercent(a.failureRate, 1) },
    { label: "Unique actors", value: formatNumber(a.uniqueActors) },
    { label: "Products impacted", value: formatNumber(a.products.length) },
    { label: "High impact", value: formatNumber(a.highImpact.length) },
  ];
  return (
    <section
      aria-label="Audit summary"
      className="grid gap-4 rounded-card border border-border bg-surface p-4 shadow-card lg:grid-cols-[2fr_3fr]"
    >
      <dl className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-control bg-surface-sunken/70 px-3 py-2">
            <dt className="text-micro text-fg-muted">{t.label}</dt>
            <dd className="text-section-title text-fg tabular">{t.value}</dd>
          </div>
        ))}
      </dl>
      <div className="min-w-0">
        <StackedColumns
          label="Audit events per day, successful and failed"
          periods={a.daily.map((d) => dayLabel(d.date))}
          segments={[
            { key: "success", label: "Successful", color: "var(--ap-chart-primary)" },
            { key: "failed", label: "Failed or denied", color: "var(--ap-chart-risk)" },
          ]}
          values={a.daily.map((d) => [d.success, d.failed])}
        />
      </div>
    </section>
  );
}

/**
 * Audit log (spec §24, §30): synchronized analytics, filter bar, dense event table and a
 * detail drawer. A reviewer can reconstruct any privileged action end to end.
 */
export async function AuditLog({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const data = await loadAudit(params);
  const pages = Math.max(1, Math.ceil(data.filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(first(params.page)) || 1));
  const rows = data.filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const eventId = first(params.event);
  const selected = eventId ? data.events.find((e) => e.id === eventId) : undefined;
  const pageQuery = (extra: Record<string, string>) =>
    auditQuery(data.filters, { ...(page > 1 ? { page: String(page) } : {}), ...extra });

  return (
    <div className="flex flex-col gap-4">
      <StreamNotice data={data} />
      <AuditFilterBar data={data}>
        <div className="flex flex-col gap-4 pt-4">
          <AuditSummary data={data} />
          {rows.length === 0 ? (
            <Card>
              <EmptyState
                icon={SearchX}
                title="No audit events match"
                body="Change the time range or filters. Audit visibility may also depend on your role."
                action={
                  <Button asChild>
                    <Link href="/audit">Clear filters</Link>
                  </Button>
                }
              />
            </Card>
          ) : (
            <Card>
              <Table label="Audit events" className="whitespace-nowrap">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Timestamp (UTC)</TableHeaderCell>
                    <TableHeaderCell>Actor</TableHeaderCell>
                    <TableHeaderCell>Action</TableHeaderCell>
                    <TableHeaderCell>Object</TableHeaderCell>
                    <TableHeaderCell>Customer</TableHeaderCell>
                    <TableHeaderCell>Product</TableHeaderCell>
                    <TableHeaderCell>Reason</TableHeaderCell>
                    <TableHeaderCell>Result</TableHeaderCell>
                    <TableHeaderCell>Request ID</TableHeaderCell>
                    <TableHeaderCell>Correlation ID</TableHeaderCell>
                    <TableHeaderCell>Source</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((e) => (
                    <TableRow
                      key={e.id}
                      aria-current={e.id === eventId ? "true" : undefined}
                      className={cn(e.id === eventId && "bg-violet-subtle/50")}
                    >
                      <TableCell>
                        <Link
                          href={`/audit${pageQuery({ event: e.id })}`}
                          scroll={false}
                          aria-label={`Open event ${e.id}: ${e.actionLabel}`}
                          className="font-medium text-fg tabular hover:text-violet-text hover:underline"
                        >
                          {formatTimestamp(e.at).replace(" UTC", "")}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {data.actorName(e.actorId)}
                        {e.effectiveIdentity ? (
                          <span className="block text-micro text-coral-text">
                            as {e.effectiveIdentity}
                          </span>
                        ) : (
                          <span className="block text-micro text-fg-muted">
                            {data.actorKind(e)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5">
                          {e.actionLabel}
                          {e.highImpact ? (
                            <Tag className="bg-coral-subtle text-coral-text">High impact</Tag>
                          ) : null}
                        </span>
                        <code className="block font-mono text-micro text-fg-muted">{e.action}</code>
                      </TableCell>
                      <TableCell>
                        <span className="text-fg-secondary">{e.objectType}</span>
                        <code className="block font-mono text-micro text-fg">{e.objectId}</code>
                      </TableCell>
                      <TableCell>{e.customerId ? data.customerName[e.customerId] : "—"}</TableCell>
                      <TableCell>{e.productId ? data.productName[e.productId] : "—"}</TableCell>
                      <TableCell className="max-w-64 truncate text-fg-secondary">
                        {e.reason ?? "—"}
                      </TableCell>
                      <TableCell>
                        <ResultBadge result={e.result} />
                      </TableCell>
                      <TableCell className="font-mono text-micro">{e.requestId}</TableCell>
                      <TableCell className="font-mono text-micro">{e.correlationId}</TableCell>
                      <TableCell className="capitalize">{e.source}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
          {pages > 1 ? (
            <nav
              aria-label="Audit pages"
              className="flex items-center justify-between gap-3 text-dense"
            >
              <span className="text-fg-muted">
                Page {page} of {pages} · {plural(data.filtered.length, "event")}
              </span>
              <span className="flex gap-2">
                {page > 1 ? (
                  <Button asChild size="sm">
                    <Link
                      href={`/audit${auditQuery(data.filters, page > 2 ? { page: String(page - 1) } : {})}`}
                    >
                      Previous
                    </Link>
                  </Button>
                ) : null}
                {page < pages ? (
                  <Button asChild size="sm">
                    <Link href={`/audit${auditQuery(data.filters, { page: String(page + 1) })}`}>
                      Next
                    </Link>
                  </Button>
                ) : null}
              </span>
            </nav>
          ) : null}
        </div>
      </AuditFilterBar>
      {selected ? (
        <EventDrawer
          key={selected.id}
          title={selected.actionLabel}
          description={`${selected.id} · ${formatTimestamp(selected.at)}`}
        >
          <EventDetail event={selected} data={data} />
        </EventDrawer>
      ) : null}
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="text-card-title text-fg">{title}</h3>
      {children}
    </section>
  );
}

/** Every audit field (spec §24): identity, action, context, change, integrity, delivery. */
function EventDetail({ event, data }: { event: AuditEvent; data: AuditData }) {
  const related = correlatedEvents(data.events, event);
  const canView = canViewChanges(data.me, event);

  return (
    <>
      <DrawerSection title="Identity">
        <DescriptionList
          columns={2}
          items={[
            { term: "Actor", value: data.actorName(event.actorId) },
            { term: "Actor type", value: data.actorKind(event) },
            { term: "Effective identity", value: event.effectiveIdentity ?? "Same as actor" },
            { term: "Authentication", value: event.authContext },
          ]}
        />
      </DrawerSection>
      <DrawerSection title="Action">
        <DescriptionList
          columns={2}
          items={[
            { term: "Action", value: event.actionLabel },
            { term: "Action key", value: <code className="font-mono">{event.action}</code> },
            { term: "Area", value: auditCategoryLabel[auditCategory(event.action)] },
            { term: "Result", value: <ResultBadge result={event.result} /> },
            {
              term: "Object",
              value: (
                <>
                  {event.objectType} · <code className="font-mono">{event.objectId}</code>
                </>
              ),
            },
            { term: "Impact", value: event.highImpact ? "High impact" : "Standard" },
          ]}
        />
      </DrawerSection>
      <DrawerSection title="Context">
        <DescriptionList
          columns={2}
          items={[
            {
              term: "Customer",
              value: event.customerId ? (
                <Link
                  href={`/customers/${event.customerId}?tab=audit`}
                  className="text-violet-text hover:underline"
                >
                  {data.customerName[event.customerId]}
                </Link>
              ) : (
                "—"
              ),
            },
            { term: "Product", value: event.productId ? data.productName[event.productId] : "—" },
            {
              term: "Environment",
              value: event.environment ? deploymentEnvironment[event.environment] : "—",
            },
            {
              term: "Source",
              value: `${event.source}${event.sourceAddress ? ` · ${event.sourceAddress}` : ""}`,
            },
            {
              term: "Request ID",
              value: <CopyableId value={event.requestId} label="Request ID" />,
            },
            {
              term: "Correlation ID",
              value: <CopyableId value={event.correlationId} label="Correlation ID" />,
            },
          ]}
        />
      </DrawerSection>
      <DrawerSection title="Change">
        {event.changes?.length ? (
          canView ? (
            <Table label="Before and after" className="whitespace-nowrap">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Field</TableHeaderCell>
                  <TableHeaderCell>Before</TableHeaderCell>
                  <TableHeaderCell>After</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {event.changes.map((c) => (
                  <TableRow key={c.field}>
                    <TableCell className="font-medium">{c.field}</TableCell>
                    <TableCell className="text-fg-muted">{c.before}</TableCell>
                    <TableCell className="whitespace-normal">{c.after}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Notice title="Before and after values are masked">
              <span className="inline-flex items-center gap-1">
                <Lock aria-hidden="true" className="size-3.5" />
                {event.sensitivity === "security"
                  ? "Security fields need the Security Administrator or Auditor role."
                  : "Commercial fields need finance or commercial scope."}
              </span>
            </Notice>
          )
        ) : (
          <p className="text-dense text-fg-muted">No field changes recorded for this action.</p>
        )}
        <DescriptionList
          items={[
            { term: "Reason", value: event.reason },
            {
              term: "Approval request",
              value: event.approvalId ? (
                <Link
                  href={`/approvals/${event.approvalId}`}
                  className="text-violet-text hover:underline"
                >
                  {event.approvalId}
                </Link>
              ) : undefined,
            },
            {
              term: "Evidence",
              value: event.evidence?.length
                ? event.evidence.map((e) => `${e.label}: ${e.reference}`).join(" · ")
                : undefined,
            },
          ]}
        />
      </DrawerSection>
      <DrawerSection title="Integrity">
        <DescriptionList
          items={[
            {
              term: "Sequence",
              value: event.sequence ? `#${formatNumber(event.sequence)}` : undefined,
            },
            {
              term: "Event hash",
              value: event.hash ? <CopyableId value={event.hash} label="Event hash" /> : undefined,
            },
            {
              term: "Previous hash",
              value: event.previousHash ? (
                <CopyableId value={event.previousHash} label="Previous hash" />
              ) : undefined,
            },
            {
              term: "Delivery",
              value:
                Date.parse(event.at) <= Date.parse(data.stream.lastDeliveredAt)
                  ? `Delivered to ${data.stream.destination}`
                  : `Waiting for ${data.stream.destination} (stream ${data.stream.state})`,
            },
          ]}
        />
        <p className="text-micro text-fg-muted">
          The log is append only. Each event hash covers the previous one; the export center
          verifies the whole chain.
        </p>
      </DrawerSection>
      {related.length > 1 ? (
        <DrawerSection title="Related events">
          <p className="text-micro text-fg-muted">
            {plural(related.length, "event")} share correlation ID {event.correlationId}.
          </p>
          <ol className="flex flex-col gap-2 border-s-2 border-border ps-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/audit${auditQuery(data.filters, { event: r.id })}`}
                  scroll={false}
                  aria-current={r.id === event.id ? "true" : undefined}
                  className={cn(
                    "text-dense hover:text-violet-text hover:underline",
                    r.id === event.id ? "font-semibold text-fg" : "text-fg-secondary",
                  )}
                >
                  {formatTimestamp(r.at)} · {r.actionLabel}
                </Link>
                <span className="block text-micro text-fg-muted">
                  {data.actorName(r.actorId)}
                  {r.effectiveIdentity ? ` as ${r.effectiveIdentity}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </DrawerSection>
      ) : null}
    </>
  );
}
