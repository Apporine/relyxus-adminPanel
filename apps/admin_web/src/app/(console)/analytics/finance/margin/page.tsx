import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { MarginEstimate } from "@/features/finance/cost";
import { AnalyticsNav, FinanceNav, FinanceSkeleton } from "@/features/finance/finance-parts";

export const metadata: Metadata = { title: "Margin estimate" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Margin estimate"
        description="Contract value minus allocated direct cost, with the range across allocation methods."
      />
      <AnalyticsNav current="finance" />
      <FinanceNav current="margin" />
      <Suspense fallback={<FinanceSkeleton />}>
        <MarginEstimate />
      </Suspense>
    </div>
  );
}
