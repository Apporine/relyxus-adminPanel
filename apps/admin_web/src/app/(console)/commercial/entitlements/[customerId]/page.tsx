import type { Metadata } from "next";
import { Suspense } from "react";
import {
  CustomerEntitlementDetail,
  EntitlementsSkeleton,
} from "@/features/commercial/entitlements";

export async function generateMetadata({
  params,
}: PageProps<"/commercial/entitlements/[customerId]">): Promise<Metadata> {
  return { title: (await params).customerId };
}

export default function Page({ params }: PageProps<"/commercial/entitlements/[customerId]">) {
  return (
    <Suspense fallback={<EntitlementsSkeleton />}>
      <CustomerEntitlementDetail params={params} />
    </Suspense>
  );
}
