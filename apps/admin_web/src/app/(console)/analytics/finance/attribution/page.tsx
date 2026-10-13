import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CostAttribution } from "@/features/finance/cost";
import { AnalyticsNav, FinanceNav, FinanceSkeleton } from "@/features/finance/finance-parts";

export const metadata: Metadata = { title: "Cost attribution" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cost attribution"
        description="How Apporine cloud cost is tagged to customers and products, and what stays unallocated."
      />
      <AnalyticsNav current="finance" />
      <FinanceNav current="attribution" />
      <Suspense fallback={<FinanceSkeleton />}>
        <CostAttribution />
      </Suspense>
    </div>
  );
}
