import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AuditAnalytics } from "@/features/audit/analytics";
import { AuditNav, AuditNavWithFilters, AuditSkeleton } from "@/features/audit/audit-parts";

export const metadata: Metadata = { title: "Audit analytics" };

export default function Page({ searchParams }: PageProps<"/audit/analytics">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit analytics"
        description="Administrative activity over time: actors, impact, failures, denials and exports. Every figure opens the matching events."
      />
      <Suspense fallback={<AuditNav current="analytics" />}>
        <AuditNavWithFilters current="analytics" searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<AuditSkeleton />}>
        <AuditAnalytics searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
