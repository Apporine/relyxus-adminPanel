import { FlaskConical, Plug, Power } from "lucide-react";
import Link from "next/link";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { EnvironmentBadge } from "@/components/shell/environment-badge";
import { StatusBadge, Tag, type BadgeTone } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/description-list";
import { Notice } from "@/components/ui/feedback";
import { Field, Label, Textarea } from "@/components/ui/field";
import { SegmentNav } from "@/components/ui/segment-nav";
import { ContentSkeleton } from "@/components/ui/skeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { roleName } from "@/domain/status";
import type { Integration } from "@/domain/types";
import { formatRelativeTime, formatTimestamp } from "@/lib/format";
import {
  getEnvironment,
  getGovernance,
  getReferenceTime,
  getSettings,
  getStaffDirectory,
  listProducts,
} from "@/server/data";

export type SettingsView =
  "organization" | "identity" | "notifications" | "integrations" | "data-policy" | "environments";

const views: { id: SettingsView; href: string; label: string }[] = [
  { id: "organization", href: "/settings", label: "Organization" },
  { id: "identity", href: "/settings/identity", label: "Identity" },
  { id: "notifications", href: "/settings/notifications", label: "Notifications" },
  { id: "integrations", href: "/settings/integrations", label: "Integrations" },
  { id: "data-policy", href: "/settings/data-policy", label: "Data policy" },
  { id: "environments", href: "/settings/environments", label: "Environments" },
];

export function SettingsNav({ current }: { current: SettingsView }) {
  return (
    <SegmentNav
      label="Settings sections"
      items={views.map((v) => ({ href: v.href, label: v.label, current: v.id === current }))}
    />
  );
}

export function SettingsSkeleton() {
  return <ContentSkeleton label="settings" cards={2} table={false} />;
}

/** Changes here are configuration changes: reasoned, approved where policy says, audited. */
function ChangeNotice() {
  return (
    <Notice title="Configuration changes are governed">
      Security policy and integration changes need a second approver and are recorded in audit.
    </Notice>
  );
}

export async function OrganizationSettings() {
  const [{ organization }, products] = await Promise.all([getSettings(), listProducts()]);
  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="org-title">
        <CardHeader>
          <CardTitle id="org-title">Organization</CardTitle>
          <DesignPreviewDialog
            trigger="Edit organization"
            triggerSize="sm"
            title="Edit organization"
            description="Organization details appear on exports and customer communications."
            confirmLabel="Save changes"
          >
            <Field>
              <Label htmlFor="org-reason">Reason</Label>
              <Textarea id="org-reason" name="reason" required />
            </Field>
          </DesignPreviewDialog>
        </CardHeader>
        <CardContent>
          <DescriptionList
            columns={2}
            items={[
              { term: "Name", value: organization.name },
              { term: "Registered in", value: organization.registeredIn },
              { term: "Primary timezone", value: organization.primaryTimezone },
              { term: "Business hours", value: organization.businessHours },
              { term: "Reporting currency", value: organization.reportingCurrency },
              { term: "FX policy", value: organization.fxPolicy },
              { term: "Support contact", value: organization.supportEmail },
              { term: "Security contact", value: organization.securityEmail },
            ]}
          />
        </CardContent>
      </Card>
      <Card aria-labelledby="products-title">
        <CardHeader>
          <div>
            <CardTitle id="products-title">Products</CardTitle>
            <CardDescription>
              Product definitions are managed in the Products module.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <Link
                  href={`/products/${p.id}`}
                  className="text-dense font-medium text-fg hover:text-violet-text hover:underline"
                >
                  {p.name}
                </Link>
                <span className="text-micro text-fg-muted">
                  {p.code} · {p.status} · {p.supportModel}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export async function IdentitySettings() {
  const { identity } = await getSettings();
  return (
    <div className="flex flex-col gap-4">
      <ChangeNotice />
      <Card aria-labelledby="idp-title">
        <CardHeader>
          <div>
            <CardTitle id="idp-title">Identity provider</CardTitle>
            <CardDescription>The identity source stays authoritative for staff.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <DescriptionList
            columns={2}
            items={[
              { term: "Provider", value: identity.provider },
              { term: "Protocol", value: identity.protocol },
              {
                term: "Issuer",
                value: <code className="font-mono text-micro">{identity.issuer}</code>,
              },
              { term: "Provisioning", value: identity.provisioning },
              { term: "MFA", value: identity.mfa },
              { term: "Session", value: identity.sessionTimeout },
              { term: "Step-up", value: identity.stepUp },
            ]}
          />
        </CardContent>
      </Card>
      <Card aria-labelledby="mapping-title">
        <CardHeader>
          <div>
            <CardTitle id="mapping-title">Group to role mapping</CardTitle>
            <CardDescription>
              Membership is managed in {identity.provider}; time limited elevation is requested in
              Security.
            </CardDescription>
          </div>
        </CardHeader>
        <Table label="Group to role mapping" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Directory group</TableHeaderCell>
              <TableHeaderCell>Control plane role</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {identity.groupMappings.map((m) => (
              <TableRow key={m.group}>
                <TableCell className="font-mono text-micro">{m.group}</TableCell>
                <TableCell>
                  {m.roles.map((r) => (
                    <Link
                      key={r}
                      href={`/security/roles/${r}`}
                      className="hover:text-violet-text hover:underline"
                    >
                      {roleName[r]}
                    </Link>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

const channelLabel = { in_app: "In app", email: "Email", teams: "Teams" };

export async function NotificationSettings() {
  const [{ channels, automations }, directory, now] = await Promise.all([
    getSettings(),
    getStaffDirectory(),
    getReferenceTime(),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="channels-title">
        <CardHeader>
          <div>
            <CardTitle id="channels-title">Channels</CardTitle>
            <CardDescription>
              Approved channels only; notifications never carry secrets.
            </CardDescription>
          </div>
        </CardHeader>
        <Table label="Notification channels" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Channel</TableHeaderCell>
              <TableHeaderCell>Destination</TableHeaderCell>
              <TableHeaderCell>Approved by</TableHeaderCell>
              <TableHeaderCell>State</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {channels.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-fg-secondary">{c.destination}</TableCell>
                <TableCell>{directory[c.approvedById]?.name}</TableCell>
                <TableCell>
                  <StatusBadge
                    tone={c.state === "active" ? "healthy" : "neutral"}
                    label={c.state === "active" ? "Active" : "Disabled"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card aria-labelledby="automation-title">
        <CardHeader>
          <div>
            <CardTitle id="automation-title">Automation rules</CardTitle>
            <CardDescription>
              Each rule shows its trigger, action, owner and scope. No automation issues or revokes
              a license; those stay governed actions.
            </CardDescription>
          </div>
        </CardHeader>
        <Table label="Automation rules">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Trigger</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>Owner and scope</TableHeaderCell>
              <TableHeaderCell>Channels</TableHeaderCell>
              <TableHeaderCell>State</TableHeaderCell>
              <TableHeaderCell>Last run</TableHeaderCell>
              <TableHeaderCell>
                <span className="sr-only">Actions</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {automations.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="min-w-56 font-medium">{r.trigger}</TableCell>
                <TableCell className="min-w-64 text-fg-secondary">{r.action}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {directory[r.ownerId]?.name}
                  <span className="block text-micro text-fg-muted">{r.scope}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {r.channels.map((c) => channelLabel[c]).join(", ")}
                </TableCell>
                <TableCell>
                  {r.testMode ? (
                    <StatusBadge tone="info" label="Test mode" icon={FlaskConical} />
                  ) : (
                    <StatusBadge
                      tone={r.enabled ? "healthy" : "neutral"}
                      label={r.enabled ? "Enabled" : "Disabled"}
                    />
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {r.lastRunAt ? formatRelativeTime(r.lastRunAt, now) : "Never"}
                  {r.lastAuditId ? (
                    <Link
                      href={`/audit?event=${r.lastAuditId}`}
                      className="block text-micro text-violet-text hover:underline"
                    >
                      Audit record
                    </Link>
                  ) : null}
                </TableCell>
                <TableCell>
                  <DesignPreviewDialog
                    trigger={r.enabled ? "Disable" : "Enable"}
                    triggerSize="sm"
                    triggerVariant="ghost"
                    title={`${r.enabled ? "Disable" : "Enable"} automation`}
                    description={`${r.trigger}. The change is recorded in audit and the owner is notified.`}
                    confirmLabel={r.enabled ? "Disable rule" : "Enable rule"}
                  >
                    <Field>
                      <Label htmlFor={`rule-${r.id}`}>Reason</Label>
                      <Textarea id={`rule-${r.id}`} name="reason" required />
                    </Field>
                  </DesignPreviewDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

const integrationTone: Record<Integration["state"], BadgeTone> = {
  healthy: "healthy",
  degraded: "risk",
  failing: "critical",
  disabled: "neutral",
};
const integrationLabel: Record<Integration["state"], string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  failing: "Failing",
  disabled: "Disabled",
};

export async function IntegrationSettings() {
  const [{ integrations }, directory, now] = await Promise.all([
    getSettings(),
    getStaffDirectory(),
    getReferenceTime(),
  ]);
  const failing = integrations.filter((i) => i.state === "failing" || i.state === "degraded");
  return (
    <div className="flex flex-col gap-4">
      {failing.length ? (
        <Notice tone="risk" title={`${failing.length} integrations need attention`}>
          {failing.map((i) => i.system).join(", ")}. Records from these sources may be stale;
          screens that use them say so.
        </Notice>
      ) : null}
      <Card>
        <Table label="Integrations">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Integration</TableHeaderCell>
              <TableHeaderCell>Owner and purpose</TableHeaderCell>
              <TableHeaderCell>Scopes and data</TableHeaderCell>
              <TableHeaderCell>Credentials</TableHeaderCell>
              <TableHeaderCell>State</TableHeaderCell>
              <TableHeaderCell>
                <span className="sr-only">Actions</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {integrations.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="whitespace-nowrap">
                  <span className="font-medium text-fg">{i.system}</span>
                  <span className="block text-micro text-fg-muted">
                    {i.integrationClass} · {i.direction}
                  </span>
                </TableCell>
                <TableCell className="min-w-56">
                  {directory[i.ownerId]?.name}
                  <span className="block text-micro text-fg-muted">{i.purpose}</span>
                </TableCell>
                <TableCell className="min-w-48">
                  <span className="flex flex-wrap gap-1">
                    {i.scopes.map((s) => (
                      <code
                        key={s}
                        className="rounded-control bg-surface-sunken px-1.5 py-0.5 font-mono text-micro"
                      >
                        {s}
                      </code>
                    ))}
                  </span>
                  <span className="mt-1 block text-micro text-fg-muted">
                    {i.dataClasses.join(", ")}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-micro">{i.credentialsRef}</TableCell>
                <TableCell className="min-w-48">
                  <StatusBadge tone={integrationTone[i.state]} label={integrationLabel[i.state]} />
                  <span className="block text-micro text-fg-muted">
                    {i.lastSuccessAt
                      ? `Last success ${formatRelativeTime(i.lastSuccessAt, now)}`
                      : "No success yet"}
                  </span>
                  {i.lastFailure ? (
                    <span className="block text-micro text-coral-text">
                      {formatTimestamp(i.lastFailureAt!)}: {i.lastFailure}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <DesignPreviewDialog
                    trigger="Disable"
                    triggerSize="sm"
                    triggerVariant="ghost"
                    triggerIcon={<Power aria-hidden="true" />}
                    title={`Disable ${i.system}`}
                    description="Disabling stops sync immediately. Screens that depend on it show the data as unavailable. The change needs approval and is recorded in audit."
                    confirmLabel="Request disable"
                    confirmVariant="destructive"
                  >
                    <Field>
                      <Label htmlFor={`int-${i.id}`}>Reason</Label>
                      <Textarea id={`int-${i.id}`} name="reason" required />
                    </Field>
                  </DesignPreviewDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card aria-labelledby="webhooks-title">
        <CardHeader>
          <CardTitle id="webhooks-title" className="flex items-center gap-2">
            <Plug aria-hidden="true" className="size-4" /> Webhook policy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex list-disc flex-col gap-1 ps-5 text-body text-fg-secondary">
            <li>Inbound webhooks are signature verified, idempotent and replay safe.</li>
            <li>
              Outbound webhooks are signed, retried with backoff and dead-lettered after 24 hours.
            </li>
            <li>API clients have explicit scopes, rotation and revocation in Security.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export async function DataPolicySettings() {
  const governance = await getGovernance();
  return (
    <div className="flex flex-col gap-4">
      <ChangeNotice />
      <Card aria-labelledby="exports-policy-title">
        <CardHeader>
          <CardTitle id="exports-policy-title">Export and residency</CardTitle>
        </CardHeader>
        <CardContent>
          <DescriptionList
            columns={2}
            items={[
              {
                term: "Exports",
                value: "Authorized fields only, audited, downloads expire after 7 days",
              },
              {
                term: "Sensitive exports",
                value: "Recorded as sensitive; evidence bundles kept 1 year",
              },
              {
                term: "Customer data residency",
                value: "Recorded per customer; control plane data in the UK",
              },
              {
                term: "Customer secrets",
                value: "Never stored: no credentials, kubeconfigs or card data",
              },
            ]}
          />
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card aria-labelledby="dp-classification-title">
          <CardHeader>
            <div>
              <CardTitle id="dp-classification-title">Classification</CardTitle>
              <CardDescription>
                <Link href="/analytics/data-quality" className="text-violet-text underline">
                  Data quality
                </Link>{" "}
                shows where these labels apply.
              </CardDescription>
            </div>
          </CardHeader>
          <Table label="Classification policy">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Fields</TableHeaderCell>
                <TableHeaderCell>Label</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {governance.classifications.map((c) => (
                <TableRow key={c.field}>
                  <TableCell>
                    {c.field}
                    <span className="block text-micro text-fg-muted">{c.object}</span>
                  </TableCell>
                  <TableCell>
                    <Tag>{c.label}</Tag>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card aria-labelledby="dp-retention-title">
          <CardHeader>
            <CardTitle id="dp-retention-title">Retention</CardTitle>
          </CardHeader>
          <Table label="Retention policy">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Record</TableHeaderCell>
                <TableHeaderCell>Kept for</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {governance.retention.map((r) => (
                <TableRow key={r.record}>
                  <TableCell>
                    {r.record}
                    <span className="block text-micro text-fg-muted">{r.basis}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{r.period}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

export async function EnvironmentSettings() {
  const [{ environments }, current] = await Promise.all([getSettings(), getEnvironment()]);
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {environments.map((e) => (
        <Card key={e.key} aria-labelledby={`env-${e.key}`}>
          <CardHeader>
            <CardTitle id={`env-${e.key}`} className="flex items-center gap-2">
              <EnvironmentBadge environment={e.key} />
              {e.key === current ? <Tag>You are here</Tag> : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList
              items={[
                { term: "URL", value: <code className="font-mono text-micro">{e.url}</code> },
                { term: "Region", value: e.region },
                { term: "Version", value: e.version },
                { term: "Data", value: e.data },
                { term: "Access", value: e.access },
                { term: "Last deploy", value: formatTimestamp(e.deployedAt) },
              ]}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
