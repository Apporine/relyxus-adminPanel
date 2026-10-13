import type { Metadata } from "next";
import { Suspense } from "react";
import { SuccessSkeleton } from "@/features/success/health";
import { CustomerHealthDetail } from "@/features/success/health";

export async function generateMetadata({
  params,
}: PageProps<"/success/health/[customerId]">): Promise<Metadata> {
  return { title: (await params).customerId };
}

export default function Page({ params }: PageProps<"/success/health/[customerId]">) {
  return (
    <Suspense fallback={<SuccessSkeleton />}>
      <CustomerHealthDetail params={params} />
    </Suspense>
  );
}
