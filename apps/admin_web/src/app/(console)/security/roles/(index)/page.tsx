import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { RoleCatalog } from "@/features/security/staff";
import { SecurityNav, SecuritySkeleton } from "@/features/security/security-parts";

export const metadata: Metadata = { title: "Roles" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles"
        description="Staff roles, their rights and restrictions, and the role pairs one person should not hold."
      />
      <SecurityNav current="roles" />
      <Suspense fallback={<SecuritySkeleton />}>
        <RoleCatalog />
      </Suspense>
    </div>
  );
}
