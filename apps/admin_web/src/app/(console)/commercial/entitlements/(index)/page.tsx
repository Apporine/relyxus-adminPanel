import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CommercialNav } from "@/features/commercial/commercial-parts";
import { EntitlementDefinitions, EntitlementsSkeleton } from "@/features/commercial/entitlements";

export const metadata: Metadata = { title: "Entitlement definitions" };

export default function Page({ searchParams }: PageProps<"/commercial/entitlements">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Commercial"
        description="Contracts, renewals and entitlements. Operating metadata only; billing and accounting stay in the finance systems."
      />
      <CommercialNav current="entitlements" />
      <Suspense fallback={<EntitlementsSkeleton />}>
        <EntitlementDefinitions searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
