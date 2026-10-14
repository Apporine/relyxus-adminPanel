import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AnalyticsNav, FinanceNav, FinanceSkeleton } from "@/features/finance/finance-parts";
import { CommercialSummary } from "@/features/finance/summary";

export const metadata: Metadata = { title: "Commercial summary" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Commercial summary"
        description="Contract value, renewal pipeline, revenue concentration and support efficiency. Apporine's view of customer economics, not the accounting ledger."
      />
      <AnalyticsNav current="finance" />
      <FinanceNav current="summary" />
      <Suspense fallback={<FinanceSkeleton />}>
        <CommercialSummary />
      </Suspense>
    </div>
  );
}
