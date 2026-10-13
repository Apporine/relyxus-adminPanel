import type { Metadata } from "next";
import { Suspense } from "react";
import { LicenseDetail, LicenseDetailSkeleton } from "@/features/licensing/license-detail";

export async function generateMetadata({
  params,
}: PageProps<"/licensing/[id]">): Promise<Metadata> {
  return { title: (await params).id };
}

export default function LicensePage({ params, searchParams }: PageProps<"/licensing/[id]">) {
  return (
    <Suspense fallback={<LicenseDetailSkeleton />}>
      <LicenseDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}
