import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { MyDecisions, MyDecisionsSkeleton } from "@/features/approvals/my-decisions";

export const metadata: Metadata = { title: "My decisions" };

export default function MyDecisionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[{ label: "Approvals", href: "/approvals" }, { label: "My decisions" }]}
        />
        <PageHeader
          title="My decisions"
          description="Requests you approved or rejected. Decisions are immutable; reopening needs a new request."
        />
      </div>
      <Suspense fallback={<MyDecisionsSkeleton />}>
        <MyDecisions />
      </Suspense>
    </div>
  );
}
