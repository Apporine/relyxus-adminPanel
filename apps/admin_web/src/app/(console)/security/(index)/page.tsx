import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SecurityPosture } from "@/features/security/posture";
import { PostureActions } from "@/features/security/reviews";
import { SecurityNav, SecuritySkeleton } from "@/features/security/security-parts";

export const metadata: Metadata = { title: "Security" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Security posture"
        description="Internal access and key risks for the control plane: privileged staff, stale access, key rotation, break glass and auth failures."
        actions={
          <Suspense fallback={null}>
            <PostureActions />
          </Suspense>
        }
      />
      <SecurityNav current="posture" />
      <Suspense fallback={<SecuritySkeleton />}>
        <SecurityPosture />
      </Suspense>
    </div>
  );
}
