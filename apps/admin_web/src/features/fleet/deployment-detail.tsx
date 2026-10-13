import { CalendarClock, ClipboardPlus, Grid3x3, PencilLine, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableId } from "@/components/ui/copyable-id";
import { DescriptionList } from "@/components/ui/description-list";
import { Field, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { Notice, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import {
  daysSinceCheckIn,
  deploymentRiskLabel,
  deploymentRisks,
  profileLabel,
  releaseFor,
  upgradeReadiness,
} from "@/domain/fleet";
import { deploymentEnvironment, licenseState, supportState } from "@/domain/status";
import { formatDate, formatRelativeTime, formatTimestamp } from "@/lib/format";
import { getDeployment, listContacts, listSupportCases } from "@/server/data";
import { ReadinessBadge, ReleaseStatusBadge, SupportTimeline } from "./fleet-parts";
import { loadFleet } from "./load";

const preflightLabel = {
  passed: "Passed",
  warnings: "Passed with warnings",
  failed: "Failed",
  not_run: "Not run",
};

const tierLabel = {
  standard: "Standard",
  premium: "Premium",
  mission_critical: "Mission critical",
};

const backupLabel = {
  healthy: "Healthy",
  failing: "Failing",
  not_shared: "Not shared by the customer",
};

const upgradeResultLabel = {
  succeeded: "succeeded",
  failed: "failed",
  rolled_back: "rolled back",
};

/**
 * Deployment detail (spec §16, §30.1): support and commercial state from customer
 * authorized metadata only. It never implies access to the customer environment.
 */
export async function DeploymentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deployment = await getDeployment(id);
  if (!deployment) notFound();
  const [data, contacts, cases] = await Promise.all([
    loadFleet(),
    listContacts(deployment.customerId),
    listSupportCases(deployment.customerId),
  ]);
  const d = deployment;
  const { now } = data;
  const context = { releases: data.releases, licenses: data.licenses, now };
  const release = releaseFor(d, data.releases);
  const license = data.licenses.find((l) => l.id === d.licenseId);
  const risks = deploymentRisks(d, context);
  const readiness = upgradeReadiness(d, context);
  const customer = data.customers.find((c) => c.id === d.customerId);
  const technicalContact = contacts.find((c) => c.roles.includes("technical"));
  const checkInAge = daysSinceCheckIn(d, now);
  const product = data.productNames[d.productId] ?? d.productId;
  const upgradeTargets = data.releases.filter(
    (r) => r.productId === d.productId && r.status === "released",
  );

  const timeline = [
    d.lastCheckInAt && { at: d.lastCheckInAt, label: "Last check in received" },
    d.lastUpgrade && {
      at: d.lastUpgrade.at,
      label: `Upgrade ${d.lastUpgrade.fromVersion} → ${d.lastUpgrade.toVersion} ${upgradeResultLabel[d.lastUpgrade.result]}`,
    },
    d.upgradePlan && {
      at: d.upgradePlan.plannedFor,
      label: `Upgrade to ${d.upgradePlan.targetVersion} planned by ${data.staff[d.upgradePlan.recordedById]?.name ?? "staff"}`,
    },
    release?.endOfSupportAt && {
      at: release.endOfSupportAt,
      label: `Release ${release.version} end of support`,
    },
    ...cases
      .filter((c) => c.status !== "resolved")
      .map((c) => ({ at: c.openedAt, label: `Support case ${c.externalRef} opened` })),
  ]
    .filter((e): e is { at: string; label: string } => Boolean(e))
    .sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Deployments", href: "/deployments" },
            ...(customer
              ? [{ label: customer.displayName, href: `/customers/${customer.id}?tab=deployments` }]
              : []),
            { label: d.logicalName },
          ]}
        />
        <PageHeader
          title={d.logicalName}
          description={`${product} ${deploymentEnvironment[d.environment].toLowerCase()} deployment for ${customer?.displayName ?? d.customerId}`}
          meta={
            <>
              <CopyableId value={d.id} label="Deployment ID" />
              <StatusBadge
                tone={supportState[d.supportState].tone}
                label={supportState[d.supportState].label}
              />
              <Tag>{deploymentEnvironment[d.environment]}</Tag>
              <Tag>{profileLabel[d.profile]}</Tag>
            </>
          }
          actions={
            <>
              <DesignPreviewDialog
                trigger="Update metadata"
                triggerIcon={<PencilLine aria-hidden="true" />}
                title="Update deployment metadata"
                description="Record customer authorized metadata only. Do not enter customer secrets, hostnames or production credentials."
                confirmLabel="Save metadata"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="meta-window">Maintenance window</Label>
                    <Input
                      id="meta-window"
                      name="maintenanceWindow"
                      defaultValue={d.maintenanceWindow}
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="meta-kit">Installation kit version</Label>
                    <Input id="meta-kit" name="installKit" defaultValue={d.installKitVersion} />
                  </Field>
                </div>
                <Field>
                  <Label htmlFor="meta-reason">Reason</Label>
                  <Textarea id="meta-reason" name="reason" required />
                  <FieldHint>The reason is stored with the audit record.</FieldHint>
                </Field>
              </DesignPreviewDialog>
              <DesignPreviewDialog
                trigger="Record upgrade plan"
                triggerIcon={<CalendarClock aria-hidden="true" />}
                title="Record upgrade plan"
                description="Record the release and window the customer agreed. Apporine does not run the upgrade from the control plane."
                confirmLabel="Record plan"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="plan-version">Target release</Label>
                    <Select
                      id="plan-version"
                      name="target"
                      defaultValue={readiness.target?.version}
                    >
                      {upgradeTargets.map((r) => (
                        <option key={r.id} value={r.version}>
                          {r.version}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field>
                    <Label htmlFor="plan-date">Planned date</Label>
                    <Input id="plan-date" name="plannedFor" type="date" required />
                  </Field>
                </div>
              </DesignPreviewDialog>
              {release ? (
                <Button asChild>
                  <Link href={`/releases/${release.id}?tab=compatibility`}>
                    <Grid3x3 aria-hidden="true" />
                    View release compatibility
                  </Link>
                </Button>
              ) : null}
              <DesignPreviewDialog
                trigger="Create support task"
                triggerVariant="primary"
                triggerIcon={<ClipboardPlus aria-hidden="true" />}
                title="Create support task"
                description={`Create a support task for ${d.logicalName}. It appears in the owner's inbox and the customer timeline.`}
                confirmLabel="Create task"
              >
                <Field>
                  <Label htmlFor="dep-task-title">Title</Label>
                  <Input id="dep-task-title" name="title" required />
                </Field>
                <Field>
                  <Label htmlFor="dep-task-due">Due date</Label>
                  <Input id="dep-task-due" name="due" type="date" required />
                </Field>
              </DesignPreviewDialog>
            </>
          }
        />
      </div>

      <Notice title="Customer authorized metadata only">
        This record never grants access to the customer environment. Health comes from check ins and
        details the customer chose to share.
      </Notice>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 stagger gap-4 lg:grid-cols-2">
          <Card aria-labelledby="env-title">
            <CardHeader>
              <CardTitle id="env-title">Environment</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList
                columns={2}
                items={[
                  { term: "Platform", value: d.platform },
                  { term: "Distribution", value: profileLabel[d.profile] },
                  { term: "Kubernetes", value: d.kubernetes },
                  { term: "Cluster ID", value: <code className="font-mono">{d.clusterId}</code> },
                  { term: "Region", value: <code className="font-mono">{d.region}</code> },
                  { term: "Country", value: d.country },
                  { term: "Data residency", value: d.residency },
                  { term: "Maintenance window", value: d.maintenanceWindow },
                ]}
              />
            </CardContent>
          </Card>

          <Card aria-labelledby="release-title">
            <CardHeader>
              <CardTitle id="release-title">Release</CardTitle>
              {release ? <ReleaseStatusBadge release={release} /> : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <DescriptionList
                columns={2}
                items={[
                  {
                    term: "Version",
                    value: release ? (
                      <Link
                        href={`/releases/${release.id}`}
                        className="font-mono text-violet-text hover:underline"
                      >
                        {d.releaseVersion}
                      </Link>
                    ) : (
                      d.releaseVersion
                    ),
                  },
                  { term: "Helm package", value: release?.helmChartVersion },
                ]}
              />
              {release ? <SupportTimeline release={release} now={now} /> : null}
            </CardContent>
          </Card>

          <Card aria-labelledby="license-title">
            <CardHeader>
              <CardTitle id="license-title">License</CardTitle>
              {license ? (
                <StatusBadge
                  tone={licenseState[license.state].tone}
                  label={licenseState[license.state].label}
                />
              ) : null}
            </CardHeader>
            <CardContent>
              <DescriptionList
                columns={2}
                items={[
                  {
                    term: "Bound license",
                    value: license ? (
                      <Link
                        href={`/licensing/${license.id}`}
                        className="font-mono text-violet-text hover:underline"
                      >
                        {license.id}
                      </Link>
                    ) : undefined,
                  },
                  { term: "Revision", value: license?.revisions.at(-1)?.revision },
                  {
                    term: "Valid until",
                    value: license ? formatDate(license.expiresAt) : undefined,
                  },
                  {
                    term: "Allowance",
                    value:
                      d.supportState === "license_mismatch"
                        ? "Outside the signed allowance"
                        : license
                          ? "Within the signed allowance"
                          : undefined,
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card aria-labelledby="health-title">
            <CardHeader>
              <CardTitle id="health-title">Supported metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList
                columns={2}
                items={[
                  {
                    term: "Last check in",
                    value: d.lastCheckInAt
                      ? `${formatRelativeTime(d.lastCheckInAt, now)}${
                          checkInAge !== undefined && checkInAge > 7 ? " (stale)" : ""
                        }`
                      : undefined,
                  },
                  { term: "Installation kit", value: d.installKitVersion },
                  { term: "Preflight", value: preflightLabel[d.preflight] },
                  {
                    term: "Last upgrade",
                    value: d.lastUpgrade
                      ? `${d.lastUpgrade.fromVersion} → ${d.lastUpgrade.toVersion}, ${upgradeResultLabel[d.lastUpgrade.result]}`
                      : undefined,
                  },
                  { term: "Backup", value: backupLabel[d.backupStatus] },
                  {
                    term: "Apporine technical owner",
                    value: data.staff[d.technicalOwnerId]?.name,
                  },
                  { term: "Customer technical contact", value: technicalContact?.name },
                  {
                    term: "Support tier",
                    value: customer ? tierLabel[customer.supportTier] : undefined,
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card aria-labelledby="timeline-title" className="lg:col-span-2">
            <CardHeader>
              <CardTitle id="timeline-title">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative flex flex-col gap-4 before:absolute before:inset-y-1 before:start-[5px] before:w-px before:bg-border">
                {timeline.map((event) => (
                  <li key={`${event.at}-${event.label}`} className="relative flex gap-3 ps-0">
                    <span
                      aria-hidden="true"
                      className={
                        event.at > now
                          ? "mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-violet bg-surface"
                          : "mt-1.5 size-[11px] shrink-0 rounded-full bg-violet ring-4 ring-surface"
                      }
                    />
                    <div>
                      <p className="text-body text-fg">{event.label}</p>
                      <p className="text-micro text-fg-muted">
                        <time dateTime={event.at}>{formatTimestamp(event.at)}</time>
                        {event.at > now ? " · upcoming" : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <aside
          aria-label="Risks and upgrade readiness"
          className="flex flex-col gap-4 xl:sticky xl:top-[calc(var(--ap-topbar-height)+1.5rem)]"
        >
          <Card aria-labelledby="risk-title" className="relative overflow-hidden">
            {risks.length ? (
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-coral" />
            ) : null}
            <CardHeader>
              <CardTitle id="risk-title">Risks</CardTitle>
              <span className="text-dense text-fg-muted tabular">{risks.length}</span>
            </CardHeader>
            <CardContent>
              {risks.length ? (
                <ul className="flex flex-col gap-2">
                  {risks.map((r) => (
                    <li key={r} className="flex items-center gap-2 text-body text-fg">
                      <ShieldAlert aria-hidden="true" className="size-4 text-coral-text" />
                      {deploymentRiskLabel[r]}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body text-fg-muted">No risks from approved metadata.</p>
              )}
            </CardContent>
          </Card>

          <Card aria-labelledby="upgrade-title">
            <CardHeader>
              <CardTitle id="upgrade-title">Upgrade readiness</CardTitle>
              <ReadinessBadge readiness={readiness.readiness} />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-dense text-fg-secondary">
                Target: newest release{" "}
                <span className="font-mono font-semibold text-fg">
                  {readiness.target?.version ?? "—"}
                </span>
              </p>
              {readiness.reasons.length ? (
                <ul className="flex list-disc flex-col gap-1 ps-5 text-dense text-fg-secondary">
                  {readiness.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
              {d.upgradePlan ? (
                <p className="rounded-control bg-violet-subtle/60 px-3 py-2 text-dense text-fg">
                  Plan recorded: {d.upgradePlan.targetVersion} on{" "}
                  {formatDate(d.upgradePlan.plannedFor)}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function DeploymentDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-20 w-2/3" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-card" />
        ))}
      </div>
    </div>
  );
}
