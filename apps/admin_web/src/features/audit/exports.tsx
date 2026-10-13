import { FileArchive, ShieldCheck, ShieldX } from "lucide-react";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag, type BadgeTone } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableId } from "@/components/ui/copyable-id";
import { DescriptionList } from "@/components/ui/description-list";
import { Notice } from "@/components/ui/feedback";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { verifyAuditChain } from "@/domain/audit";
import type { AuditExportStatus } from "@/domain/types";
import { formatDate, formatNumber, formatTimestamp, plural } from "@/lib/format";
import { loadAudit } from "./load";

const statusPresentation: Record<AuditExportStatus, { label: string; tone: BadgeTone }> = {
  queued: { label: "Export queued", tone: "info" },
  running: { label: "Running", tone: "info" },
  ready: { label: "Ready", tone: "healthy" },
  expired: { label: "Expired", tone: "neutral" },
  denied: { label: "Denied", tone: "critical" },
};

/**
 * Export center (spec §24): audit exports and evidence bundles with integrity metadata,
 * and verification of the append-only hash chain.
 */
export async function ExportCenter() {
  const data = await loadAudit();
  const chain = verifyAuditChain(data.events);
  const exports = [...data.exports].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const queued = exports.filter((e) => e.status === "queued" || e.status === "running");

  return (
    <div className="flex flex-col gap-4">
      {queued.map((e) => (
        <Notice key={e.id} title={`Export queued: ${e.title}`}>
          Requested by {data.staffName(e.requestedById)} at {formatTimestamp(e.requestedAt)}. It
          appears here with its manifest digest when ready.
        </Notice>
      ))}

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card aria-labelledby="chain-title">
          <CardHeader>
            <div>
              <CardTitle id="chain-title">Log integrity</CardTitle>
              <CardDescription>
                Every event hash covers the one before it, so any change or deletion breaks the
                chain.
              </CardDescription>
            </div>
            {chain.intact ? (
              <StatusBadge tone="healthy" label="Chain intact" icon={ShieldCheck} />
            ) : (
              <StatusBadge tone="critical" label="Chain broken" icon={ShieldX} />
            )}
          </CardHeader>
          <CardContent>
            <DescriptionList
              columns={2}
              items={[
                { term: "Events verified", value: formatNumber(chain.checked) },
                {
                  term: chain.intact ? "Head hash" : "First broken event",
                  value: chain.intact ? (
                    <CopyableId value={chain.head} label="Head hash" />
                  ) : (
                    `#${chain.brokenAt}`
                  ),
                },
                { term: "Verified at", value: formatTimestamp(data.now) },
                { term: "Storage", value: "Append only, object lock 7 years" },
              ]}
            />
          </CardContent>
        </Card>
        <Card aria-labelledby="stream-title">
          <CardHeader>
            <div>
              <CardTitle id="stream-title">SIEM delivery</CardTitle>
              <CardDescription>{data.stream.destination}</CardDescription>
            </div>
            <StatusBadge
              tone={data.stream.state === "healthy" ? "healthy" : "risk"}
              label={data.stream.state === "delayed" ? "Stream delayed" : data.stream.state}
            />
          </CardHeader>
          <CardContent>
            <DescriptionList
              items={[
                { term: "Last acknowledged", value: formatTimestamp(data.stream.lastDeliveredAt) },
                { term: "Waiting", value: plural(data.stream.backlog, "event") },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-fg-secondary">
          Exports contain only fields the requester may view. Exports with restricted fields are
          recorded as sensitive.
        </p>
        <DesignPreviewDialog
          trigger="Create evidence bundle"
          triggerVariant="primary"
          triggerIcon={<FileArchive aria-hidden="true" />}
          title="Create evidence bundle"
          description="Bundle audit events, approvals and decisions for a control or investigation. The bundle and its manifest are stored immutably and the export is recorded in audit."
          confirmLabel="Create bundle"
        >
          <Field>
            <Label htmlFor="bundle-title">Title</Label>
            <Input id="bundle-title" name="title" required />
          </Field>
          <Field>
            <Label htmlFor="bundle-scope">Scope</Label>
            <Select id="bundle-scope" name="scope" defaultValue="correlation">
              <option value="correlation">One correlation ID, end to end</option>
              <option value="review">An access review campaign</option>
              <option value="range">A time range and filters</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="bundle-reason">Reason</Label>
            <Textarea id="bundle-reason" name="reason" required />
          </Field>
        </DesignPreviewDialog>
      </div>

      <Card>
        <Table label="Exports and evidence bundles" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Export</TableHeaderCell>
              <TableHeaderCell>Requested by</TableHeaderCell>
              <TableHeaderCell>Requested</TableHeaderCell>
              <TableHeaderCell>Format</TableHeaderCell>
              <TableHeaderCell className="text-end">Rows</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Manifest digest</TableHeaderCell>
              <TableHeaderCell>Available until</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {exports.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <span className="flex items-center gap-1.5 font-medium text-fg">
                    {e.title}
                    {e.kind === "evidence_bundle" ? <Tag>Evidence bundle</Tag> : null}
                    {e.sensitive ? (
                      <Tag className="bg-coral-subtle text-coral-text">Sensitive</Tag>
                    ) : null}
                  </span>
                  <span className="block text-micro text-fg-muted">
                    <span className="font-mono">{e.id}</span> · {e.scope}
                  </span>
                </TableCell>
                <TableCell>{data.staffName(e.requestedById)}</TableCell>
                <TableCell>{formatTimestamp(e.requestedAt)}</TableCell>
                <TableCell>{e.format}</TableCell>
                <TableCell className="text-end tabular">
                  {e.rows === undefined ? "—" : formatNumber(e.rows)}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    tone={statusPresentation[e.status].tone}
                    label={statusPresentation[e.status].label}
                  />
                </TableCell>
                <TableCell>
                  {e.manifestDigest ? (
                    <CopyableId value={e.manifestDigest} label="Manifest digest" truncate />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{e.expiresAt ? formatDate(e.expiresAt) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
