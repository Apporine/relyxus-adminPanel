import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AuditNav, AuditSkeleton } from "@/features/audit/audit-parts";
import { ExportCenter } from "@/features/audit/exports";

export const metadata: Metadata = { title: "Export center" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Export center"
        description="Audit exports and evidence bundles with integrity metadata, and verification of the append-only log."
      />
      <AuditNav current="exports" />
      <Suspense fallback={<AuditSkeleton />}>
        <ExportCenter />
      </Suspense>
    </div>
  );
}
