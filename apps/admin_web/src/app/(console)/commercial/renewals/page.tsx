import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CommercialNav } from "@/features/commercial/commercial-parts";
import { RenewalRadar, RenewalRadarSkeleton } from "@/features/commercial/renewal-radar";

export const metadata: Metadata = { title: "Renewal radar" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Commercial"
        description="Contracts, renewals and entitlements. Operating metadata only; billing and accounting stay in the finance systems."
      />
      <CommercialNav current="renewals" />
      <Suspense fallback={<RenewalRadarSkeleton />}>
        <RenewalRadar />
      </Suspense>
    </div>
  );
}
