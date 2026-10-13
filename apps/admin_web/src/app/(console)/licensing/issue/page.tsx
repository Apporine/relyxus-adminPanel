import type { Metadata } from "next";
import { Suspense } from "react";
import { LicenseFlowPage, LicenseFlowSkeleton } from "@/features/licensing/flow-page";

export const metadata: Metadata = { title: "Issue commercial license" };

export default function IssueLicensePage() {
  return (
    <Suspense fallback={<LicenseFlowSkeleton />}>
      <LicenseFlowPage params={Promise.resolve({})} />
    </Suspense>
  );
}
