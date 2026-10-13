import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { FilterFrame, type FilterDefinition } from "@/components/filters/filter-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { compareVersions, isSupportedRelease, releaseImpact } from "@/domain/fleet";
import { releaseStatus } from "@/domain/status";
import type { ReleaseStatus } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { ReleaseStatusBadge } from "../fleet/fleet-parts";
import { loadFleet } from "../fleet/load";
import { PromotionStepper } from "./release-parts";

/** Release list (spec §17): promotion state, support window, gates and install base. */
export async function ReleaseList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, data] = await Promise.all([searchParams, loadFleet()]);
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const product = data.products.find((p) => p.id === first(params.product))?.id;
  const status = (Object.keys(releaseStatus) as ReleaseStatus[]).find(
    (s) => s === first(params.status),
  );
  const visible = data.releases
    .filter((r) => (!product || r.productId === product) && (!status || r.status === status))
    .sort(
      (a, b) => a.productId.localeCompare(b.productId) || compareVersions(b.version, a.version),
    );

  const definitions: FilterDefinition[] = [
    {
      name: "product",
      label: "Product",
      allLabel: "All products",
      options: data.products.map((p) => ({ value: p.id, label: p.name })),
    },
    {
      name: "status",
      label: "Promotion state",
      allLabel: "Any state",
      options: Object.entries(releaseStatus).map(([value, p]) => ({ value, label: p.label })),
    },
  ];

  return (
    <FilterFrame label="Release filters" filters={definitions} values={{ product, status }}>
      <Card aria-labelledby="release-results" className="mt-6">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="release-results" className="text-card-title">
            Releases
          </h2>
          <p aria-live="polite" className="text-dense text-fg-muted tabular">
            {visible.length} of {data.releases.length} releases
          </p>
        </div>
        {visible.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No releases match"
            body="Change the filters to see releases in other promotion states."
            action={
              <Button asChild variant="link">
                <Link href="/releases">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <Table label="Releases" className="whitespace-nowrap">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Version</TableHeaderCell>
                <TableHeaderCell>Product</TableHeaderCell>
                <TableHeaderCell>State</TableHeaderCell>
                <TableHeaderCell>Promotion</TableHeaderCell>
                <TableHeaderCell>Released</TableHeaderCell>
                <TableHeaderCell>End of support</TableHeaderCell>
                <TableHeaderCell>Gates</TableHeaderCell>
                <TableHeaderCell className="text-end">Deployments</TableHeaderCell>
                <TableHeaderCell className="text-end">Customers</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((r) => {
                const impact = releaseImpact(r, data.deployments);
                const passed = r.gates.filter((g) => g.status === "passed").length;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/releases/${r.id}`}
                        className="font-mono font-semibold text-fg hover:text-violet-text hover:underline"
                      >
                        {r.version}
                      </Link>
                    </TableCell>
                    <TableCell>{data.productNames[r.productId]}</TableCell>
                    <TableCell>
                      <ReleaseStatusBadge release={r} />
                    </TableCell>
                    <TableCell>
                      <PromotionStepper status={r.status} compact />
                    </TableCell>
                    <TableCell>{r.releasedAt ? formatDate(r.releasedAt) : "—"}</TableCell>
                    <TableCell>{r.endOfSupportAt ? formatDate(r.endOfSupportAt) : "—"}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "tabular",
                          passed < r.gates.length && "font-semibold text-coral-text",
                        )}
                      >
                        {passed} of {r.gates.length} passed
                      </span>
                      <span className="block text-micro text-fg-muted">
                        {isSupportedRelease(r, data.now) ? "Supported" : "Not supported"}
                      </span>
                    </TableCell>
                    <TableCell className="text-end tabular">{impact.deployments.length}</TableCell>
                    <TableCell className="text-end tabular">{impact.customerIds.length}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </FilterFrame>
  );
}

export function ReleaseListSkeleton() {
  return <Skeleton className="h-96 rounded-card" aria-busy="true" />;
}
