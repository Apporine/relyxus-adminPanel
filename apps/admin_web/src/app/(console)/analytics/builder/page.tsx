import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AnalyticsNav, FinanceSkeleton } from "@/features/finance/finance-parts";
import { loadReports } from "@/features/reports/load";
import { ReportBuilder } from "@/features/reports/report-builder";

export const metadata: Metadata = { title: "Report builder" };

async function Builder() {
  const data = await loadReports();
  return <ReportBuilder datasets={data.datasets} />;
}

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Report builder"
        description="Build a report from approved datasets. Restricted fields stay locked unless your role allows them."
      />
      <AnalyticsNav current="builder" />
      <Suspense fallback={<FinanceSkeleton />}>
        <Builder />
      </Suspense>
    </div>
  );
}
