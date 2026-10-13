import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SigningKeys } from "@/features/security/keys-clients";
import { SecurityNav, SecuritySkeleton } from "@/features/security/security-parts";

export const metadata: Metadata = { title: "Signing keys" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Signing keys"
        description="License signing key metadata: status, rotation, overlap and verifier adoption."
      />
      <SecurityNav current="keys" />
      <Suspense fallback={<SecuritySkeleton />}>
        <SigningKeys />
      </Suspense>
    </div>
  );
}
