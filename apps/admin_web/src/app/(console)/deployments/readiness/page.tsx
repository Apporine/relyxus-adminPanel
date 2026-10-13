import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DeploymentsNav } from "@/features/fleet/fleet-parts";
import { ReadinessSkeleton, UpgradeReadiness } from "@/features/fleet/readiness";

export const metadata: Metadata = { title: "Upgrade readiness" };

export default function ReadinessPage({ searchParams }: PageProps<"/deployments/readiness">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Deployments"
        description="Customer authorized installations: release, support and license state from approved metadata only."
      />
      <DeploymentsNav current="readiness" />
      <Suspense fallback={<ReadinessSkeleton />}>
        <UpgradeReadiness searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
