import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shell/module-placeholder";
import { AnalyticsNav } from "@/features/finance/finance-parts";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <AnalyticsNav current="reports" />
      <ModulePlaceholder
        title="Analytics"
        description="Reports, saved views and operational intelligence."
        feature="F14"
        screens={["Report library", "Report builder", "Saved views", "Scheduled reports"]}
      />
    </div>
  );
}
