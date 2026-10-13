import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { BreakGlassRegister } from "@/features/security/break-glass";
import { SecurityNav, SecuritySkeleton } from "@/features/security/security-parts";

export const metadata: Metadata = { title: "Break glass" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Break glass"
        description="Time limited emergency access with reason, scope, approver and evidence."
      />
      <SecurityNav current="break-glass" />
      <Suspense fallback={<SecuritySkeleton />}>
        <BreakGlassRegister />
      </Suspense>
    </div>
  );
}
