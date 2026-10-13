import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ReleasesNav } from "@/features/fleet/fleet-parts";
import {
  CompatibilityMatrix,
  CompatibilityMatrixSkeleton,
} from "@/features/releases/compatibility-matrix";

export const metadata: Metadata = { title: "Compatibility matrix" };

export default function CompatibilityPage({ searchParams }: PageProps<"/releases/compatibility">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Releases"
        description="Product releases from draft to end of support. A release is supported only when its acceptance gates pass."
      />
      <ReleasesNav current="compatibility" />
      <Suspense fallback={<CompatibilityMatrixSkeleton />}>
        <CompatibilityMatrix searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
