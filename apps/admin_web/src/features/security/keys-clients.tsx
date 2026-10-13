import { KeyRound, Plus } from "lucide-react";
import Link from "next/link";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { Tag } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableId } from "@/components/ui/copyable-id";
import { Notice } from "@/components/ui/feedback";
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
  activeSigningKey,
  adoptionRatio,
  credentialAgeDays,
  credentialStatus,
  isIdleClient,
} from "@/domain/security";
import { cn } from "@/lib/cn";
import { formatDate, formatRelativeTime, plural } from "@/lib/format";
import { listApprovals } from "@/server/data";
import { loadSecurity } from "./load";
import { credentialLabel, KeyTimeline, keyStatusLabel, Progress, Status } from "./security-parts";

const stateLabel = { active: "Active", disabled: "Disabled", revoked: "Revoked" };

/** API client registry (spec §23): owner, scope, last use, credential rotation and state. */
export async function ApiClientRegistry() {
  const data = await loadSecurity();
  const rows = [...data.clients].sort(
    (a, b) =>
      Number(a.state !== "active") - Number(b.state !== "active") ||
      a.rotationDueAt.localeCompare(b.rotationDueAt),
  );
  const attention = rows.filter((c) => {
    const s = credentialStatus(c, data.now);
    return s === "overdue" || s === "due_soon" || isIdleClient(c, data.now);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-fg-secondary">
          {plural(rows.filter((c) => c.state === "active").length, "active client")} ·{" "}
          {plural(attention.length, "client")} need attention. Client secrets are never shown.
        </p>
        <DesignPreviewDialog
          trigger="Register API client"
          triggerVariant="primary"
          triggerIcon={<Plus aria-hidden="true" />}
          title="Register API client"
          description="Create a machine client with the narrowest scopes it needs. The credential is shown once to the owner and rotates on schedule."
          confirmLabel="Register client"
        >
          <Field>
            <Label htmlFor="client-name">Name</Label>
            <Input id="client-name" name="name" required />
          </Field>
          <Field>
            <Label htmlFor="client-owner">Owner</Label>
            <Select id="client-owner" name="owner" required defaultValue="">
              <option value="" disabled>
                Choose an owner
              </option>
              {data.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="client-scopes">Scopes</Label>
            <Input id="client-scopes" name="scopes" placeholder="customers:read" required />
            <FieldHint>Separate scopes with spaces. Write scopes need security approval.</FieldHint>
          </Field>
          <Field>
            <Label htmlFor="client-purpose">Purpose</Label>
            <Textarea id="client-purpose" name="purpose" required />
          </Field>
        </DesignPreviewDialog>
      </div>
      <Card>
        <Table label="API clients" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Client</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Environment</TableHeaderCell>
              <TableHeaderCell>Scopes</TableHeaderCell>
              <TableHeaderCell>State</TableHeaderCell>
              <TableHeaderCell>Last used</TableHeaderCell>
              <TableHeaderCell className="text-end">Credential age</TableHeaderCell>
              <TableHeaderCell>Rotation</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((c) => {
              const idle = isIdleClient(c, data.now);
              const status = credentialStatus(c, data.now);
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className="font-medium text-fg">{c.name}</span>
                    <span className="block max-w-72 truncate text-micro text-fg-muted">
                      {c.purpose}
                    </span>
                    <CopyableId value={c.id} label="API client ID" />
                  </TableCell>
                  <TableCell>{data.directory[c.ownerId]?.name}</TableCell>
                  <TableCell>
                    <Tag>{c.environment}</Tag>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      {c.scopes.map((s) => (
                        <code
                          key={s}
                          className="rounded-control bg-surface-sunken px-1.5 py-0.5 font-mono text-micro text-fg-secondary"
                        >
                          {s}
                        </code>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell>{stateLabel[c.state]}</TableCell>
                  <TableCell className={cn(idle && "font-medium text-coral-text")}>
                    {c.lastUsedAt ? formatRelativeTime(c.lastUsedAt, data.now) : "Never"}
                    {idle ? " · idle" : ""}
                  </TableCell>
                  <TableCell className="text-end tabular">
                    {credentialAgeDays(c, data.now)} days
                  </TableCell>
                  <TableCell>
                    <Status value={credentialLabel[status]} />
                    <span className="block text-micro text-fg-muted">
                      Due {formatDate(c.rotationDueAt)}
                    </span>
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
 * Signing key metadata (spec §23): key ID, algorithm, status, dates, overlap and verifier
 * adoption. Private key material is never displayed.
 */
export async function SigningKeys() {
  const [data, approvals] = await Promise.all([loadSecurity(), listApprovals()]);
  const active = activeSigningKey(data.keys);
  const planned = data.keys.find((k) => k.status === "planned");
  const rotationRequest = approvals.find(
    (a) => a.type === "signing_key_rotation" && a.state === "pending",
  );

  return (
    <div className="flex flex-col gap-4">
      <Notice title="Key metadata only">
        Private keys stay in KMS and are never displayed or exported. Signing happens in the License
        Issuer after approval.
      </Notice>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-fg-secondary">
          {active
            ? `${active.id} signs new licenses. Next rotation ${formatDate(active.nextRotationAt ?? active.createdAt)}.`
            : "No active signing key."}
          {rotationRequest ? (
            <>
              {" "}
              Rotation request{" "}
              <Link
                href={`/approvals/${rotationRequest.id}`}
                className="font-medium text-violet-text hover:underline"
              >
                {rotationRequest.id}
              </Link>{" "}
              is waiting for approval.
            </>
          ) : null}
        </p>
        <DesignPreviewDialog
          trigger="Plan rotation"
          triggerVariant="primary"
          triggerIcon={<KeyRound aria-hidden="true" />}
          title="Plan signing key rotation"
          description="Create the rotation plan, overlap window and verifier adoption steps before changing active signing metadata."
          confirmLabel="Plan rotation"
        >
          <Field>
            <Label htmlFor="rotation-key">Next key</Label>
            <Select id="rotation-key" name="key" defaultValue={planned?.id ?? "new"}>
              {planned ? <option value={planned.id}>{planned.id} (planned)</option> : null}
              <option value="new">Generate a new key in KMS</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="rotation-overlap">Overlap window</Label>
            <Select id="rotation-overlap" name="overlap" defaultValue="60">
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </Select>
            <FieldHint>Verifiers trust both keys during the overlap.</FieldHint>
          </Field>
          <Field>
            <Label htmlFor="rotation-adoption">Verifier adoption steps</Label>
            <Textarea id="rotation-adoption" name="adoption" required />
          </Field>
          <Field>
            <Label htmlFor="rotation-rollback">Rollback plan reference</Label>
            <Input id="rotation-rollback" name="rollback" required />
          </Field>
        </DesignPreviewDialog>
      </div>

      <Card aria-labelledby="timeline-title">
        <CardHeader>
          <div>
            <CardTitle id="timeline-title">Key timeline</CardTitle>
            <CardDescription>
              Signing period, verify-only overlap and planned rotation.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <KeyTimeline keys={data.keys} now={data.now} />
        </CardContent>
      </Card>

      <Card>
        <Table label="Signing keys" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Key ID</TableHeaderCell>
              <TableHeaderCell>Algorithm</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Created</TableHeaderCell>
              <TableHeaderCell>Next rotation</TableHeaderCell>
              <TableHeaderCell>Overlap ends</TableHeaderCell>
              <TableHeaderCell>Verifier adoption</TableHeaderCell>
              <TableHeaderCell className="text-end">Current licenses</TableHeaderCell>
              <TableHeaderCell>Public key fingerprint</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.keys.map((k) => (
              <TableRow key={k.id}>
                <TableCell>
                  <CopyableId value={k.id} label="Signing key ID" />
                  <span className="block text-micro text-fg-muted">
                    Custodian {data.directory[k.custodianId]?.name}
                  </span>
                </TableCell>
                <TableCell>{k.algorithm}</TableCell>
                <TableCell>
                  <Status value={keyStatusLabel[k.status]} />
                </TableCell>
                <TableCell>{formatDate(k.createdAt)}</TableCell>
                <TableCell>{k.nextRotationAt ? formatDate(k.nextRotationAt) : "—"}</TableCell>
                <TableCell>{k.overlapEndsAt ? formatDate(k.overlapEndsAt) : "—"}</TableCell>
                <TableCell>
                  <Progress
                    done={k.verifierAdoption.trusted}
                    total={k.verifierAdoption.total}
                    label="releases"
                    risk={k.status !== "retired" && adoptionRatio(k) < 1}
                  />
                </TableCell>
                <TableCell className="text-end tabular">{data.licensesByKey[k.id] ?? 0}</TableCell>
                <TableCell>
                  <CopyableId
                    value={k.publicKeyFingerprint}
                    label="Public key fingerprint"
                    truncate
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
