import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ReleasesNav } from "@/features/fleet/fleet-parts";
import { ReleaseList, ReleaseListSkeleton } from "@/features/releases/release-list";

export const metadata: Metadata = { title: "Releases" };

export default function ReleasesPage({ searchParams }: PageProps<"/releases">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Releases"
        description="Product releases from draft to end of support. A release is supported only when its acceptance gates pass."
      />
      <ReleasesNav current="list" />
      <Suspense fallback={<ReleaseListSkeleton />}>
        <ReleaseList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
