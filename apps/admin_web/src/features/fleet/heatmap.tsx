import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { SegmentNav } from "@/components/ui/segment-nav";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { releaseHeatmap } from "@/domain/fleet";
import { deploymentEnvironment } from "@/domain/status";
import type { DeploymentEnvironment } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatDate, plural } from "@/lib/format";
import { ReleaseStatusBadge } from "./fleet-parts";
import { loadFleet } from "./load";

const environments: DeploymentEnvironment[] = ["production", "staging", "dr"];

/** Sequential Violet ramp; the count is always printed, so color is never the only cue. */
function cellTone(count: number, max: number): string {
  if (count === 0) return "bg-surface-sunken text-fg-muted";
  const share = count / max;
  if (share > 0.66) return "bg-violet text-white";
  if (share > 0.33) return "bg-chart-primary-2 text-ink";
  return "bg-chart-primary-3 text-ink";
}

/** Release heatmap (spec §16.1): deployments by release and environment with support status. */
export async function ReleaseHeatmap({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, data] = await Promise.all([searchParams, loadFleet()]);
  const requested = Array.isArray(params.product) ? params.product[0] : params.product;
  const product = data.products.find((p) => p.id === requested) ?? data.products[0];
  if (!product) return null;
  const rows = releaseHeatmap(product.id, data.deployments, data.releases);
  const max = Math.max(1, ...rows.flatMap((r) => environments.map((e) => r.counts[e])));

  return (
    <div className="flex flex-col gap-4">
      <SegmentNav
        label="Product"
        items={data.products.map((p) => ({
          href: `/deployments/heatmap?product=${p.id}`,
          label: p.name,
          current: p.id === product.id,
        }))}
      />
      <Card aria-labelledby="heatmap-title">
        <CardHeader>
          <div>
            <CardTitle id="heatmap-title">{product.name} deployments by release</CardTitle>
            <CardDescription>
              Each cell opens the matching deployments. Darker cells hold more deployments.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-micro text-fg-muted" aria-hidden="true">
            Fewer
            <span className="flex gap-0.5">
              {["bg-surface-sunken", "bg-chart-primary-3", "bg-chart-primary-2", "bg-violet"].map(
                (c) => (
                  <span key={c} className={cn("size-4 rounded-sm", c)} />
                ),
              )}
            </span>
            More
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table label={`${product.name} release heatmap`}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Release</TableHeaderCell>
                <TableHeaderCell>Support</TableHeaderCell>
                {environments.map((e) => (
                  <TableHeaderCell key={e} className="text-center">
                    {deploymentEnvironment[e]}
                  </TableHeaderCell>
                ))}
                <TableHeaderCell className="text-end">Customers</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.release.id} className="hover:bg-transparent">
                  <TableCell>
                    <Link
                      href={`/releases/${row.release.id}`}
                      className="font-mono font-semibold text-fg hover:text-violet-text hover:underline"
                    >
                      {row.release.version}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <ReleaseStatusBadge release={row.release} />
                      {row.release.endOfSupportAt ? (
                        <span className="text-micro text-fg-muted">
                          to {formatDate(row.release.endOfSupportAt)}
                        </span>
                      ) : null}
                    </span>
                  </TableCell>
                  {environments.map((e, i) => {
                    const count = row.counts[e];
                    return (
                      <TableCell key={e} className="p-1">
                        <Link
                          href={`/deployments?product=${product.id}&release=${row.release.version}&environment=${e}`}
                          aria-label={`${plural(count, "deployment")} on ${row.release.version} in ${deploymentEnvironment[e]}`}
                          className={cn(
                            "flex h-11 min-w-24 animate-fade-in items-center justify-center rounded-control text-body font-semibold tabular",
                            "transition-transform duration-(--ap-duration-fast) hover:scale-[1.04] hover:shadow-lift",
                            cellTone(count, max),
                          )}
                          style={{ animationDelay: `${i * 60}ms` }}
                        >
                          {count}
                        </Link>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-end tabular">{row.customers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function HeatmapSkeleton() {
  return <Skeleton className="h-96 rounded-card" aria-busy="true" />;
}
