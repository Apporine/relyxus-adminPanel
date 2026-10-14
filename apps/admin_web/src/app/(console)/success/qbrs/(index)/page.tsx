import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SuccessSkeleton } from "@/features/success/health";
import { QbrList } from "@/features/success/plans";
import { SuccessNav } from "@/features/success/success-parts";

export const metadata: Metadata = { title: "QBRs" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Success and support"
        description="Customer health, success plans, onboarding and support. Health is advisory; support content stays in the support platform."
      />
      <SuccessNav current="qbrs" />
      <Suspense fallback={<SuccessSkeleton />}>
        <QbrList />
      </Suspense>
    </div>
  );
}
