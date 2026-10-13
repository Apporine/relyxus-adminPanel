import type { Metadata } from "next";
import { Suspense } from "react";
import { LicenseFlowPage, LicenseFlowSkeleton } from "@/features/licensing/flow-page";

export const metadata: Metadata = { title: "License request" };

export default function LicenseActionPage({ params }: PageProps<"/licensing/[id]/[action]">) {
  return (
    <Suspense fallback={<LicenseFlowSkeleton />}>
      <LicenseFlowPage params={params} />
    </Suspense>
  );
}
