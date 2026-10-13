import Link from "next/link";
import { SegmentedBar } from "@/components/charts/simple-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { SegmentNav } from "@/components/ui/segment-nav";
import {
  latestReleased,
  profileLabel,
  readinessLabel,
  upgradeReadiness,
  type Readiness,
} from "@/domain/fleet";
import { deploymentEnvironment } from "@/domain/status";
import { plural } from "@/lib/format";
import { ReadinessBadge } from "./fleet-parts";
import { loadFleet } from "./load";

const order: Readiness[] = ["blocked", "review_needed", "compatible", "current"];

const segmentColor: Record<Readiness, string> = {
  blocked: "var(--ap-chart-critical)",
  review_needed: "var(--ap-chart-neutral)",
  compatible: "var(--ap-chart-primary)",
  current: "var(--ap-chart-healthy)",
};

/**
 * Upgrade readiness (spec §16.1): every deployment against the newest released version,
 * grouped as blocked, review needed or compatible, each with its reasons.
 */
export async function UpgradeReadiness({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, data] = await Promise.all([searchParams, loadFleet()]);
  const requested = Array.isArray(params.product) ? params.product[0] : params.product;
  const product = data.products.find((p) => p.id === requested) ?? data.products[0];
  if (!product) return null;
  const target = latestReleased(product.id, data.releases);
  const context = { releases: data.releases, licenses: data.licenses, now: data.now };
  const results = data.deployments
    .filter((d) => d.productId === product.id)
    .map((d) => ({ deployment: d, ...upgradeReadiness(d, context) }));
  const groups = order.map((readiness) => ({
    readiness,
    items: results.filter((r) => r.readiness === readiness),
  }));

  return (
    <div className="flex flex-col gap-4">
      <SegmentNav
        label="Product"
        items={data.products.map((p) => ({
          href: `/deployments/readiness?product=${p.id}`,
          label: p.name,
          current: p.id === product.id,
        }))}
      />
      <Card aria-labelledby="readiness-title">
        <CardHeader>
          <div>
            <CardTitle id="readiness-title">
              Readiness to upgrade to {product.name} {target?.version ?? "—"}
            </CardTitle>
            <CardDescription>
              Judged from approved metadata only: compatibility, upgrade path, license, preflight,
              check in and the last upgrade result.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <SegmentedBar
            className="h-3"
            segments={groups.map((g) => ({
              key: g.readiness,
              label: readinessLabel[g.readiness],
              value: g.items.length,
              color: segmentColor[g.readiness],
            }))}
          />
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-dense text-fg-secondary">
            {groups.map((g) => (
              <li key={g.readiness} className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-sm"
                  style={{ background: segmentColor[g.readiness] }}
                />
                {readinessLabel[g.readiness]}
                <span className="font-semibold text-fg tabular">{g.items.length}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {groups
        .filter((g) => g.items.length > 0)
        .map((group) => (
          <section key={group.readiness} aria-labelledby={`group-${group.readiness}`}>
            <h2
              id={`group-${group.readiness}`}
              className="mb-2 flex items-center gap-2 text-section-title text-fg"
            >
              {readinessLabel[group.readiness]}
              <span className="text-body font-normal text-fg-muted">
                {plural(group.items.length, "deployment")}
              </span>
            </h2>
            <ul className="grid stagger gap-3 lg:grid-cols-2">
              {group.items.map(({ deployment: d, readiness, reasons }) => (
                <li
                  key={d.id}
                  className="rounded-card border border-border bg-surface p-4 shadow-card transition-[transform,box-shadow] duration-(--ap-duration-panel) hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/deployments/${d.id}`}
                        className="font-semibold text-fg hover:text-violet-text hover:underline"
                      >
                        {d.logicalName}
                      </Link>
                      <p className="text-micro text-fg-muted">
                        {data.customerNames[d.customerId]} · {deploymentEnvironment[d.environment]}{" "}
                        · {profileLabel[d.profile]} · on{" "}
                        <span className="font-mono">{d.releaseVersion}</span>
                      </p>
                    </div>
                    <ReadinessBadge readiness={readiness} />
                  </div>
                  {reasons.length ? (
                    <ul className="mt-3 flex list-disc flex-col gap-1 ps-5 text-dense text-fg-secondary">
                      {reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

export function ReadinessSkeleton() {
  return <Skeleton className="h-96 rounded-card" aria-busy="true" />;
}
