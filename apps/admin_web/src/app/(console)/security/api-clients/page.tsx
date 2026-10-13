import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ApiClientRegistry } from "@/features/security/keys-clients";
import { SecurityNav, SecuritySkeleton } from "@/features/security/security-parts";

export const metadata: Metadata = { title: "API clients" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="API clients"
        description="Machine clients of the Control API with owner, scopes, last use and credential rotation."
      />
      <SecurityNav current="clients" />
      <Suspense fallback={<SecuritySkeleton />}>
        <ApiClientRegistry />
      </Suspense>
    </div>
  );
}
