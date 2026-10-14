import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AuditActions, AuditLog } from "@/features/audit/audit-log";
import { AuditNav, AuditNavWithFilters, AuditSkeleton } from "@/features/audit/audit-parts";

export const metadata: Metadata = { title: "Audit log" };

export default function Page({ searchParams }: PageProps<"/audit">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit log"
        description="Who changed what and when. Append only; analytics, table and exports always show the same events."
        actions={
          <Suspense fallback={null}>
            <AuditActions searchParams={searchParams} />
          </Suspense>
        }
      />
      <Suspense fallback={<AuditNav current="log" />}>
        <AuditNavWithFilters current="log" searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<AuditSkeleton />}>
        <AuditLog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
