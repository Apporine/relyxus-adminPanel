import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DeploymentsNav } from "@/features/fleet/fleet-parts";
import { HeatmapSkeleton, ReleaseHeatmap } from "@/features/fleet/heatmap";

export const metadata: Metadata = { title: "Release heatmap" };

export default function HeatmapPage({ searchParams }: PageProps<"/deployments/heatmap">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Deployments"
        description="Customer authorized installations: release, support and license state from approved metadata only."
      />
      <DeploymentsNav current="heatmap" />
      <Suspense fallback={<HeatmapSkeleton />}>
        <ReleaseHeatmap searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
