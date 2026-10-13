import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CostToServe } from "@/features/finance/cost";
import { AnalyticsNav, FinanceNav, FinanceSkeleton } from "@/features/finance/finance-parts";

export const metadata: Metadata = { title: "Cost to serve" };

export default function Page({ searchParams }: PageProps<"/analytics/finance/cost-to-serve">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cost to serve"
        description="Apporine's direct service economics: cloud, support and operations cost by customer, with sources and method."
      />
      <AnalyticsNav current="finance" />
      <FinanceNav current="cost" />
      <Suspense fallback={<FinanceSkeleton />}>
        <CostToServe searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
