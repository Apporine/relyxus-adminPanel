import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AnalyticsNav, FinanceSkeleton } from "@/features/finance/finance-parts";
import { ReportLibrary } from "@/features/reports/library";

export const metadata: Metadata = { title: "Report library" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Report library"
        description="Reports over approved datasets, by family. Each report shows only the fields your role may see."
      />
      <AnalyticsNav current="reports" />
      <Suspense fallback={<FinanceSkeleton />}>
        <ReportLibrary />
      </Suspense>
    </div>
  );
}
