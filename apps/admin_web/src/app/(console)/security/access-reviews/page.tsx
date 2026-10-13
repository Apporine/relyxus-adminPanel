import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AccessReviewList } from "@/features/security/reviews";
import { SecurityNav, SecuritySkeleton } from "@/features/security/security-parts";

export const metadata: Metadata = { title: "Access reviews" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Access reviews"
        description="Campaigns that confirm or remove staff role assignments. Existing access is unchanged until decisions are applied."
      />
      <SecurityNav current="reviews" />
      <Suspense fallback={<SecuritySkeleton />}>
        <AccessReviewList />
      </Suspense>
    </div>
  );
}
