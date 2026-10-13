import { CircleCheck, CircleDashed, CircleX, FileWarning } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableId } from "@/components/ui/copyable-id";
import { DescriptionList } from "@/components/ui/description-list";
import { Field, FieldHint, Input, Label, Textarea } from "@/components/ui/field";
import { Notice, Skeleton } from "@/components/ui/feedback";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentNav } from "@/components/ui/segment-nav";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import {
  deploymentProfiles,
  isSupportedRelease,
  profileLabel,
  releaseImpact,
} from "@/domain/fleet";
import { deploymentEnvironment, supportState } from "@/domain/status";
import type { AcceptanceGate } from "@/domain/types";
import { formatDate, plural } from "@/lib/format";
import { getRelease } from "@/server/data";
import { ReleaseStatusBadge, SupportTimeline } from "../fleet/fleet-parts";
import { loadFleet, type FleetData } from "../fleet/load";
import { CompatibilityCell, PromotionStepper } from "./release-parts";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "compatibility", label: "Compatibility" },
  { id: "impact", label: "Customer impact" },
] as const;
type ReleaseTab = (typeof tabs)[number]["id"];

const gateIcon: Record<AcceptanceGate["status"], typeof CircleCheck> = {
  passed: CircleCheck,
  failed: CircleX,
  pending: CircleDashed,
};

const gateTone: Record<AcceptanceGate["status"], string> = {
  passed: "text-cyan-text",
  failed: "text-coral-text",
  pending: "text-fg-muted",
};

/** Release detail (spec §17): artifacts, gates, compatibility and customer impact preview. */
export async function ReleaseDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const release = await getRelease(id);
  if (!release) notFound();
  const data = await loadFleet();
  const requested = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab: ReleaseTab = tabs.find((t) => t.id === requested)?.id ?? "overview";
  const product = data.productNames[release.productId] ?? release.productId;
  const supported = isSupportedRelease(release, data.now);
  const pendingGates = release.gates.filter((g) => g.status !== "passed");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[{ label: "Releases", href: "/releases" }, { label: release.version }]}
        />
        <PageHeader
          title={`${product} ${release.version}`}
          description={
            release.releasedAt
              ? `Released ${formatDate(release.releasedAt)}`
              : "Not released. Artifacts exist but the release is not available to customers."
          }
          meta={
            <>
              <CopyableId value={release.id} label="Release ID" />
              <ReleaseStatusBadge release={release} />
              <StatusBadge
                tone={supported ? "healthy" : "neutral"}
                label={supported ? "Supported" : "Not supported"}
              />
            </>
          }
        />
      </div>

      <Card aria-labelledby="promotion-title">
        <CardHeader>
          <CardTitle id="promotion-title">Promotion</CardTitle>
        </CardHeader>
        <CardContent>
          <PromotionStepper status={release.status} />
          {pendingGates.length ? (
            <p className="mt-3 text-dense text-fg-secondary">
              {plural(pendingGates.length, "acceptance gate")} not passed. A release is never
              supported because its artifacts exist.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <SegmentNav
        label="Release sections"
        items={tabs.map((t) => ({
          href: `/releases/${release.id}?tab=${t.id}`,
          label: t.label,
          current: t.id === tab,
        }))}
      />

      <section aria-label={`${tabs.find((t) => t.id === tab)?.label} section`}>
        {tab === "overview" ? (
          <OverviewTab release={release} now={data.now} />
        ) : tab === "compatibility" ? (
          <CompatibilityTab release={release} data={data} />
        ) : (
          <ImpactTab release={release} data={data} />
        )}
      </section>
    </div>
  );
}

type Release = NonNullable<Awaited<ReturnType<typeof getRelease>>>;

function OverviewTab({ release, now }: { release: Release; now: string }) {
  return (
    <div className="grid stagger gap-4 lg:grid-cols-2">
      <Card aria-labelledby="artifacts-title">
        <CardHeader>
          <CardTitle id="artifacts-title">Artifacts</CardTitle>
        </CardHeader>
        <CardContent>
          <DescriptionList
            items={[
              {
                term: "OCI digest",
                value: <CopyableId value={release.ociDigest} label="OCI digest" />,
              },
              { term: "Helm package", value: release.helmChartVersion },
              {
                term: "SBOM",
                value: release.sbomRef ? (
                  <code className="font-mono text-micro">{release.sbomRef}</code>
                ) : undefined,
              },
              { term: "Signature", value: release.signed ? "Signed" : "Unsigned" },
              {
                term: "Provenance",
                value: release.provenance ? "Attested" : "No provenance attestation",
              },
              { term: "Direct upgrade from", value: `${release.minUpgradeFrom} or later` },
            ]}
          />
        </CardContent>
      </Card>

      <Card aria-labelledby="gates-title">
        <CardHeader>
          <CardTitle id="gates-title">Acceptance gates</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {release.gates.map((gate) => {
              const Icon = gateIcon[gate.status];
              return (
                <li key={gate.name} className="flex items-center gap-2.5 text-body">
                  <Icon aria-hidden="true" className={`size-4 shrink-0 ${gateTone[gate.status]}`} />
                  <span className="flex-1 text-fg">{gate.name}</span>
                  <span className={`text-micro font-medium capitalize ${gateTone[gate.status]}`}>
                    {gate.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card aria-labelledby="window-title">
        <CardHeader>
          <CardTitle id="window-title">Support window</CardTitle>
        </CardHeader>
        <CardContent>
          <SupportTimeline release={release} now={now} />
        </CardContent>
      </Card>

      <Card aria-labelledby="notes-title">
        <CardHeader>
          <CardTitle id="notes-title">Release notes and dependencies</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex list-disc flex-col gap-1 ps-5 text-body text-fg-secondary">
            {release.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <DescriptionList
            columns={2}
            items={release.dependencies.map((dep) => ({ term: dep.name, value: dep.versions }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function CompatibilityTab({ release, data }: { release: Release; data: FleetData }) {
  return (
    <Card>
      <Table label={`Compatibility for ${release.version}`}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Profile</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Notes</TableHeaderCell>
            <TableHeaderCell className="text-end">Deployments on this profile</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {deploymentProfiles.map((profile) => {
            const entry = release.compatibility[profile];
            return (
              <TableRow key={profile}>
                <TableCell className="font-medium whitespace-nowrap text-fg">
                  {profileLabel[profile]}
                </TableCell>
                <TableCell className="p-1">
                  <CompatibilityCell entry={entry} />
                </TableCell>
                <TableCell>{entry.note ?? "—"}</TableCell>
                <TableCell className="text-end tabular">
                  {
                    data.deployments.filter(
                      (d) => d.productId === release.productId && d.profile === profile,
                    ).length
                  }
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

/** Customer impact preview (spec §17): who a deprecation or end of support change affects. */
function ImpactTab({ release, data }: { release: Release; data: FleetData }) {
  const impact = releaseImpact(release, data.deployments);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid stagger grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Customers affected"
          value={String(impact.customerIds.length)}
          href={`/deployments?release=${release.version}`}
          source={`Deployments running ${release.version}`}
        />
        <MetricCard
          label="Deployments affected"
          value={String(impact.deployments.length)}
          href={`/deployments?release=${release.version}`}
          source="Registered deployments"
        />
        <MetricCard
          label="Production affected"
          value={String(impact.production)}
          href={`/deployments?release=${release.version}&environment=production`}
          source="Production deployments"
        />
      </div>

      <Card aria-labelledby="impact-title">
        <CardHeader>
          <div>
            <CardTitle id="impact-title">Affected deployments</CardTitle>
            <CardDescription>
              Customers to notify before {release.version} is deprecated or reaches end of support.
            </CardDescription>
          </div>
          <DesignPreviewDialog
            trigger="Preview end of support change"
            triggerIcon={<FileWarning aria-hidden="true" />}
            title="Change end of support"
            description={`Changing the support window for ${release.version} affects ${plural(impact.customerIds.length, "customer")} and ${plural(impact.deployments.length, "deployment")}. The change needs release manager approval.`}
            confirmLabel="Request change"
          >
            <Field>
              <Label htmlFor="eos-date">New end of support date</Label>
              <Input id="eos-date" name="endOfSupport" type="date" required />
            </Field>
            <Field>
              <Label htmlFor="eos-reason">Reason</Label>
              <Textarea id="eos-reason" name="reason" required />
              <FieldHint>Affected customers are listed in the request for communication.</FieldHint>
            </Field>
          </DesignPreviewDialog>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {impact.deployments.length === 0 ? (
            <div className="px-4 pb-2">
              <Notice title="No deployments run this release">
                Changing its support window affects no customer.
              </Notice>
            </div>
          ) : (
            <Table label={`Deployments on ${release.version}`} className="whitespace-nowrap">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Deployment</TableHeaderCell>
                  <TableHeaderCell>Environment</TableHeaderCell>
                  <TableHeaderCell>Profile</TableHeaderCell>
                  <TableHeaderCell>Support</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {impact.deployments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link
                        href={`/customers/${d.customerId}`}
                        className="font-medium text-fg hover:text-violet-text hover:underline"
                      >
                        {data.customerNames[d.customerId]}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/deployments/${d.id}`}
                        className="hover:text-violet-text hover:underline"
                      >
                        {d.logicalName}
                      </Link>
                    </TableCell>
                    <TableCell>{deploymentEnvironment[d.environment]}</TableCell>
                    <TableCell>{profileLabel[d.profile]}</TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={supportState[d.supportState].tone}
                        label={supportState[d.supportState].label}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ReleaseDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-20 w-2/3" />
      <Skeleton className="h-24 rounded-card" />
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}
