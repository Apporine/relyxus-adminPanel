import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SensitiveAccessReport } from "@/features/security/break-glass";
import { SecurityNav, SecuritySkeleton } from "@/features/security/security-parts";

export const metadata: Metadata = { title: "Sensitive data access" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sensitive data access"
        description="Who viewed or exported restricted commercial or security fields."
      />
      <SecurityNav current="data-access" />
      <Suspense fallback={<SecuritySkeleton />}>
        <SensitiveAccessReport />
      </Suspense>
    </div>
  );
}
