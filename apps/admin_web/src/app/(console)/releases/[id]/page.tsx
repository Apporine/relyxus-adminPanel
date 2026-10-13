import type { Metadata } from "next";
import { Suspense } from "react";
import { ReleaseDetail, ReleaseDetailSkeleton } from "@/features/releases/release-detail";

export async function generateMetadata({ params }: PageProps<"/releases/[id]">): Promise<Metadata> {
  return { title: (await params).id };
}

export default function ReleasePage({ params, searchParams }: PageProps<"/releases/[id]">) {
  return (
    <Suspense fallback={<ReleaseDetailSkeleton />}>
      <ReleaseDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}
