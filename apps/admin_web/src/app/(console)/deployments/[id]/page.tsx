import type { Metadata } from "next";
import { Suspense } from "react";
import { DeploymentDetail, DeploymentDetailSkeleton } from "@/features/fleet/deployment-detail";

export async function generateMetadata({
  params,
}: PageProps<"/deployments/[id]">): Promise<Metadata> {
  return { title: (await params).id };
}

export default function DeploymentPage({ params }: PageProps<"/deployments/[id]">) {
  return (
    <Suspense fallback={<DeploymentDetailSkeleton />}>
      <DeploymentDetail params={params} />
    </Suspense>
  );
}
