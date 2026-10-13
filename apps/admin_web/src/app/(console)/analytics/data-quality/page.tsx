import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AnalyticsNav, FinanceSkeleton } from "@/features/finance/finance-parts";
import { DataQualityCenter } from "@/features/reports/data-quality";

export const metadata: Metadata = { title: "Data quality" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data quality"
        description="Records operators can trust: checks, completeness, duplicates, source ownership, classification and retention."
      />
      <AnalyticsNav current="data-quality" />
      <Suspense fallback={<FinanceSkeleton />}>
        <DataQualityCenter />
      </Suspense>
    </div>
  );
}
