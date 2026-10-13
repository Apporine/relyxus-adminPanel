import type { Metadata } from "next";
import { Suspense } from "react";
import { roleName } from "@/domain/status";
import type { RoleKey } from "@/domain/types";
import { SecuritySkeleton } from "@/features/security/security-parts";
import { RoleDetail } from "@/features/security/staff";

export async function generateMetadata({
  params,
}: PageProps<"/security/roles/[role]">): Promise<Metadata> {
  const { role } = await params;
  return { title: roleName[role as RoleKey] ?? role };
}

export default function Page({ params }: PageProps<"/security/roles/[role]">) {
  return (
    <Suspense fallback={<SecuritySkeleton />}>
      <RoleDetail params={params} />
    </Suspense>
  );
}
