import { Activity, AlertTriangle, Server, ServerCog } from "lucide-react";
import Link from "next/link";
import { FilterFrame, type FilterDefinition } from "@/components/filters/filter-frame";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
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
  compareVersions,
  deploymentRisks,
  filterFleet,
  parseFleetFilters,
  profileLabel,
  releaseFor,
} from "@/domain/fleet";
import { deploymentEnvironment, licenseState, supportState } from "@/domain/status";
import { formatRelativeTime } from "@/lib/format";
import { ReleaseStatusBadge, RiskTags } from "./fleet-parts";
import { loadFleet } from "./load";

/** Fleet table (spec §16.1) with every filter the spec lists, kept in the URL. */
export async function FleetList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, data] = await Promise.all([searchParams, loadFleet()]);
  const { deployments, releases, licenses, now, customerNames } = data;
  const regions = [...new Set(deployments.map((d) => d.region))].sort();
  const versions = [...new Set(deployments.map((d) => d.releaseVersion))].sort((a, b) =>
    compareVersions(b, a),
  );
  const filters = parseFleetFilters(params, {
    products: data.products.map((p) => p.id),
    customers: data.customers.map((c) => c.id),
    regions,
    releases: versions,
  });
  const context = { releases, licenses, customerNames, now };
  const visible = filterFleet(deployments, filters, context);
  const atRisk = deployments.filter((d) => deploymentRisks(d, context).length > 0);

  const definitions: FilterDefinition[] = [
    {
      name: "product",
      label: "Product",
      allLabel: "All products",
      options: data.products.map((p) => ({ value: p.id, label: p.name })),
    },
    {
      name: "customer",
      label: "Customer",
      allLabel: "All customers",
      options: data.customers
        .filter((c) => deployments.some((d) => d.customerId === c.id))
        .map((c) => ({ value: c.id, label: c.displayName })),
    },
    {
      name: "environment",
      label: "Environment",
      allLabel: "All environments",
      options: Object.entries(deploymentEnvironment).map(([value, label]) => ({ value, label })),
    },
    {
      name: "platform",
      label: "Platform",
      allLabel: "All platforms",
      options: ["AWS", "Azure", "Google Cloud", "OpenShift", "On premises"].map((p) => ({
        value: p,
        label: p,
      })),
    },
    {
      name: "region",
      label: "Region",
      allLabel: "All regions",
      options: regions.map((r) => ({ value: r, label: r })),
    },
    {
      name: "release",
      label: "Release",
      allLabel: "All releases",
      options: versions.map((v) => ({ value: v, label: v })),
    },
    {
      name: "support",
      label: "Support state",
      allLabel: "Any support state",
      options: Object.entries(supportState).map(([value, p]) => ({ value, label: p.label })),
    },
    {
      name: "license",
      label: "License state",
      allLabel: "Any license state",
      options: [
        ...Object.entries(licenseState).map(([value, p]) => ({ value, label: p.label })),
        { value: "none", label: "No license bound" },
      ],
    },
    {
      name: "risk",
      label: "Risk",
      allLabel: "Any risk",
      options: [{ value: "any", label: "Needs attention" }],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Fleet summary" className="grid stagger grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          label="Registered deployments"
          value={String(deployments.length)}
          detail={`${new Set(deployments.map((d) => d.customerId)).size} customers`}
          href="/deployments"
          source="Customer authorized deployment records"
          icon={<Server />}
        />
        <MetricCard
          label="Production"
          value={String(deployments.filter((d) => d.environment === "production").length)}
          detail={`${deployments.filter((d) => d.environment === "dr").length} disaster recovery`}
          href="/deployments?environment=production"
          source="Deployments with environment Production"
          icon={<ServerCog />}
        />
        <MetricCard
          label="Need attention"
          value={String(atRisk.length)}
          detail="Release, license, check in or upgrade risk"
          href="/deployments?risk=any"
          source="Deployment risk rules (spec §16.1)"
          icon={<AlertTriangle />}
        />
        <MetricCard
          label="Stale check ins"
          value={String(
            deployments.filter((d) => deploymentRisks(d, context).includes("stale_check_in"))
              .length,
          )}
          detail="No check in for over 7 days"
          href="/deployments?support=stale_check_in"
          source="Last check in metadata"
          icon={<Activity />}
        />
      </section>

      <FilterFrame
        label="Fleet filters"
        filters={definitions}
        values={{
          q: filters.q || undefined,
          product: filters.product,
          customer: filters.customer,
          environment: filters.environment,
          platform: filters.platform,
          region: filters.region,
          release: filters.release,
          support: filters.support,
          license: filters.license,
          risk: filters.risk,
        }}
        search={{ name: "q", label: "Search", placeholder: "Deployment, cluster ID or customer" }}
      >
        <Card aria-labelledby="fleet-results" className="mt-6">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 id="fleet-results" className="text-card-title">
              Fleet
            </h2>
            <p aria-live="polite" className="text-dense text-fg-muted tabular">
              {visible.length} of {deployments.length} deployments
            </p>
          </div>
          {visible.length === 0 ? (
            <EmptyState
              icon={Server}
              title="No deployments match"
              body="Change the filters, or register an authorized customer environment after the installation plan is agreed."
              action={
                <Button asChild variant="link">
                  <Link href="/deployments">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <Table label="Deployments" className="whitespace-nowrap">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Deployment</TableHeaderCell>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Environment</TableHeaderCell>
                  <TableHeaderCell>Platform</TableHeaderCell>
                  <TableHeaderCell>Region</TableHeaderCell>
                  <TableHeaderCell>Release</TableHeaderCell>
                  <TableHeaderCell>Support</TableHeaderCell>
                  <TableHeaderCell>License</TableHeaderCell>
                  <TableHeaderCell>Last check in</TableHeaderCell>
                  <TableHeaderCell>Risks</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((d) => {
                  const release = releaseFor(d, releases);
                  const license = licenses.find((l) => l.id === d.licenseId);
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Link
                          href={`/deployments/${d.id}`}
                          className="font-medium text-fg hover:text-violet-text hover:underline"
                        >
                          {d.logicalName}
                        </Link>
                        <span className="block font-mono text-micro text-fg-muted">{d.id}</span>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/customers/${d.customerId}?tab=deployments`}
                          className="hover:text-violet-text hover:underline"
                        >
                          {customerNames[d.customerId] ?? d.customerId}
                        </Link>
                      </TableCell>
                      <TableCell>{deploymentEnvironment[d.environment]}</TableCell>
                      <TableCell>
                        {profileLabel[d.profile]}
                        <span className="block text-micro text-fg-muted">{d.kubernetes}</span>
                      </TableCell>
                      <TableCell className="font-mono text-micro">{d.region}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          {release ? (
                            <Link
                              href={`/releases/${release.id}`}
                              className="font-mono font-medium text-fg hover:text-violet-text hover:underline"
                            >
                              {d.releaseVersion}
                            </Link>
                          ) : (
                            <span className="font-mono">{d.releaseVersion}</span>
                          )}
                          {release && release.status !== "released" ? (
                            <ReleaseStatusBadge release={release} />
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={supportState[d.supportState].tone}
                          label={supportState[d.supportState].label}
                        />
                      </TableCell>
                      <TableCell>
                        {license ? (
                          <span className="flex flex-col">
                            <Link
                              href={`/licensing/${license.id}`}
                              className="font-mono text-micro text-fg hover:text-violet-text hover:underline"
                            >
                              {license.id}
                            </Link>
                            <span className="text-micro text-fg-muted">
                              {licenseState[license.state].label}
                            </span>
                          </span>
                        ) : (
                          <span className="text-fg-muted italic">Not bound</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.lastCheckInAt ? formatRelativeTime(d.lastCheckInAt, now) : "Never"}
                      </TableCell>
                      <TableCell>
                        <RiskTags risks={deploymentRisks(d, context)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </FilterFrame>
    </div>
  );
}

export function FleetListSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}
