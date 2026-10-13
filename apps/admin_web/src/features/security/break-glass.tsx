import { Lock, Siren } from "lucide-react";
import Link from "next/link";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { breakGlassState } from "@/domain/security";
import { formatTimestamp, plural } from "@/lib/format";
import { loadSecurity } from "./load";
import { breakGlassLabel, Status } from "./security-parts";

/**
 * Break glass register (spec §23): reason, scope, approver, activation, expiry and
 * evidence. Emergency access is time limited, audited and approved by policy.
 */
export async function BreakGlassRegister() {
  const data = await loadSecurity();
  const rows = [...data.breakGlass].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const active = rows.filter((a) => breakGlassState(a, data.now) === "active");

  return (
    <div className="flex flex-col gap-4">
      {active.map((a) => (
        <Notice
          key={a.id}
          tone="critical"
          title={`Break glass active: ${data.directory[a.staffId]?.name}, ${a.incidentRef}`}
        >
          {a.scope}. Expires {formatTimestamp(a.expiresAt)}. {plural(a.actionsRecorded, "action")}{" "}
          recorded in audit so far.
        </Notice>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-fg-secondary">
          Every action under elevated access is recorded and reviewed after the incident.
        </p>
        <DesignPreviewDialog
          trigger="Activate access"
          triggerVariant="destructive"
          triggerIcon={<Siren aria-hidden="true" />}
          title="Activate break glass access"
          description="Emergency access is time limited, audited and subject to the configured approval policy."
          confirmLabel="Activate access"
          confirmVariant="destructive"
        >
          <Field>
            <Label htmlFor="bg-incident">Incident reference</Label>
            <Input id="bg-incident" name="incident" placeholder="INC-0000" required />
          </Field>
          <Field>
            <Label htmlFor="bg-scope">Access needed</Label>
            <Select id="bg-scope" name="scope" required defaultValue="">
              <option value="" disabled>
                Choose the access
              </option>
              <option value="license_operator">License Operator for one customer</option>
              <option value="license_read">License read only</option>
              <option value="platform_admin">Platform Administrator, production runtime</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="bg-duration">Duration</Label>
            <Select id="bg-duration" name="duration" defaultValue="2h">
              <option value="1h">1 hour</option>
              <option value="2h">2 hours</option>
              <option value="4h">4 hours</option>
            </Select>
            <FieldHint>
              Access ends automatically at expiry. A security approver is notified.
            </FieldHint>
          </Field>
          <Field>
            <Label htmlFor="bg-reason">Reason</Label>
            <Textarea id="bg-reason" name="reason" required />
          </Field>
        </DesignPreviewDialog>
      </div>

      <Card>
        <Table label="Break glass register" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Staff</TableHeaderCell>
              <TableHeaderCell>Incident and reason</TableHeaderCell>
              <TableHeaderCell>Scope</TableHeaderCell>
              <TableHeaderCell>State</TableHeaderCell>
              <TableHeaderCell>Approver</TableHeaderCell>
              <TableHeaderCell>Activated</TableHeaderCell>
              <TableHeaderCell>Expiry</TableHeaderCell>
              <TableHeaderCell className="text-end">Actions recorded</TableHeaderCell>
              <TableHeaderCell>Evidence</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link
                    href={`/security/staff?person=${a.staffId}`}
                    className="font-medium text-fg hover:text-violet-text hover:underline"
                  >
                    {data.directory[a.staffId]?.name}
                  </Link>
                  <span className="block font-mono text-micro text-fg-muted">{a.id}</span>
                </TableCell>
                <TableCell className="min-w-72 whitespace-normal">
                  <span className="font-medium text-fg">{a.incidentRef}</span>
                  <span className="block text-micro text-fg-muted">{a.reason}</span>
                </TableCell>
                <TableCell className="min-w-56 whitespace-normal">{a.scope}</TableCell>
                <TableCell>
                  <Status value={breakGlassLabel[breakGlassState(a, data.now)]} />
                </TableCell>
                <TableCell>
                  {a.approverId ? data.directory[a.approverId]?.name : "—"}
                  {a.approvalId ? (
                    <Link
                      href={`/approvals/${a.approvalId}`}
                      className="block text-micro text-violet-text hover:underline"
                    >
                      {a.approvalId}
                    </Link>
                  ) : null}
                </TableCell>
                <TableCell>
                  {a.activatedAt ? formatTimestamp(a.activatedAt) : "Not activated"}
                </TableCell>
                <TableCell>
                  {formatTimestamp(a.expiresAt)}
                  {a.endedAt ? (
                    <span className="block text-micro text-fg-muted">
                      Ended early {formatTimestamp(a.endedAt)}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-end tabular">{a.actionsRecorded}</TableCell>
                <TableCell>
                  <ul className="text-micro text-fg-secondary">
                    {a.evidence.map((e) => (
                      <li key={e.reference}>
                        {e.label}: <span className="font-mono">{e.reference}</span>
                      </li>
                    ))}
                  </ul>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

const classificationLabel = { commercial: "Commercial", security: "Security" };

/**
 * Sensitive data access report (spec §23): who viewed or exported restricted commercial
 * or security fields. Only Security Administrators and Auditors can read it.
 */
export async function SensitiveAccessReport() {
  const data = await loadSecurity();
  if (!data.canViewSensitiveAccess) {
    return (
      <Card aria-label="Sensitive data access report">
        <EmptyState
          icon={Lock}
          title="Restricted"
          body="Only Security Administrators and Auditors can see who viewed or exported restricted fields. Ask the security team for an evidence export."
        />
      </Card>
    );
  }

  return (
    <Card>
      <Table label="Sensitive data access" className="whitespace-nowrap">
        <TableHead>
          <TableRow>
            <TableHeaderCell>When</TableHeaderCell>
            <TableHeaderCell>Staff</TableHeaderCell>
            <TableHeaderCell>Action</TableHeaderCell>
            <TableHeaderCell>Field</TableHeaderCell>
            <TableHeaderCell>Record</TableHeaderCell>
            <TableHeaderCell>Purpose</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.sensitive.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{formatTimestamp(e.at)}</TableCell>
              <TableCell>{data.directory[e.staffId]?.name}</TableCell>
              <TableCell>
                <StatusBadge
                  tone={e.action === "exported" ? "risk" : "neutral"}
                  label={e.action === "exported" ? "Exported" : "Viewed"}
                />
              </TableCell>
              <TableCell>
                {e.field}
                <span className="block text-micro text-fg-muted">
                  {classificationLabel[e.classification]}
                </span>
              </TableCell>
              <TableCell className="font-mono text-micro">
                {e.objectType} · {e.objectId}
              </TableCell>
              <TableCell className="text-fg-secondary">{e.purpose}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
