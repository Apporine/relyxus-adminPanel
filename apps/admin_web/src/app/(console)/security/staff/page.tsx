import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SecurityNav, SecuritySkeleton } from "@/features/security/security-parts";
import { StaffAccessList } from "@/features/security/staff";

export const metadata: Metadata = { title: "Staff access" };

export default function Page({ searchParams }: PageProps<"/security/staff">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Staff access"
        description="Identity source, roles, scopes, MFA, sign ins, sessions and privileged grants for every staff account."
      />
      <SecurityNav current="staff" />
      <Suspense fallback={<SecuritySkeleton />}>
        <StaffAccessList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
