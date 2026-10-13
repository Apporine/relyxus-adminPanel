import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AnalyticsNav, FinanceSkeleton } from "@/features/finance/finance-parts";
import { SavedViews } from "@/features/reports/library";

export const metadata: Metadata = { title: "Saved views" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Saved views"
        description="Saved filters, columns, sort and scope for module screens, private or shared with your team."
      />
      <AnalyticsNav current="views" />
      <Suspense fallback={<FinanceSkeleton />}>
        <SavedViews />
      </Suspense>
    </div>
  );
}
