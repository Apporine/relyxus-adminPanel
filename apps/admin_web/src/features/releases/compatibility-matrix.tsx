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
import { compareVersions, deploymentProfiles, profileLabel } from "@/domain/fleet";
import { releaseStatus } from "@/domain/status";
import { loadFleet } from "../fleet/load";
import { CompatibilityCell } from "./release-parts";

/**
 * Compatibility matrix (spec §17): supported deployment profiles by release, with the
 * Kubernetes range in every cell and how many deployments run each profile today.
 */
export async function CompatibilityMatrix({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, data] = await Promise.all([searchParams, loadFleet()]);
  const requested = Array.isArray(params.product) ? params.product[0] : params.product;
  const product = data.products.find((p) => p.id === requested) ?? data.products[0];
  if (!product) return null;
  const releases = data.releases
    .filter((r) => r.productId === product.id && r.status !== "end_of_support")
    .sort((a, b) => compareVersions(b.version, a.version));

  return (
    <div className="flex flex-col gap-4">
      <SegmentNav
        label="Product"
        items={data.products.map((p) => ({
          href: `/releases/compatibility?product=${p.id}`,
          label: p.name,
          current: p.id === product.id,
        }))}
      />
      <Card aria-labelledby="matrix-title">
        <CardHeader>
          <div>
            <CardTitle id="matrix-title">{product.name} compatibility</CardTitle>
            <CardDescription>
              A profile is supported only when its conformance gate passed. Releases past end of
              support are omitted.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table label={`${product.name} compatibility matrix`}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Profile</TableHeaderCell>
                <TableHeaderCell className="text-end">In fleet</TableHeaderCell>
                {releases.map((r) => (
                  <TableHeaderCell key={r.id}>
                    <Link
                      href={`/releases/${r.id}?tab=compatibility`}
                      className="font-mono text-fg hover:text-violet-text hover:underline"
                    >
                      {r.version}
                    </Link>
                    <span className="block font-normal">{releaseStatus[r.status].label}</span>
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {deploymentProfiles.map((profile) => (
                <TableRow key={profile} className="hover:bg-transparent">
                  <TableCell className="font-medium whitespace-nowrap text-fg">
                    {profileLabel[profile]}
                  </TableCell>
                  <TableCell className="text-end tabular">
                    {
                      data.deployments.filter(
                        (d) => d.productId === product.id && d.profile === profile,
                      ).length
                    }
                  </TableCell>
                  {releases.map((r) => (
                    <TableCell key={r.id} className="p-1">
                      <CompatibilityCell entry={r.compatibility[profile]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function CompatibilityMatrixSkeleton() {
  return <Skeleton className="h-96 rounded-card" aria-busy="true" />;
}
