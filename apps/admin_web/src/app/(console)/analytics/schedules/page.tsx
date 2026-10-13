import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AnalyticsNav, FinanceSkeleton } from "@/features/finance/finance-parts";
import { ScheduledReports } from "@/features/reports/library";

export const metadata: Metadata = { title: "Scheduled reports" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Scheduled reports"
        description="Reports delivered on a schedule to authorized recipients, with sensitive data minimized."
      />
      <AnalyticsNav current="schedules" />
      <Suspense fallback={<FinanceSkeleton />}>
        <ScheduledReports />
      </Suspense>
    </div>
  );
}
