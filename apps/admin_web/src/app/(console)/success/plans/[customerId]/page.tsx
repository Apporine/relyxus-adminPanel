import type { Metadata } from "next";
import { Suspense } from "react";
import { SuccessSkeleton } from "@/features/success/health";
import { SuccessPlan } from "@/features/success/plans";

export async function generateMetadata({
  params,
}: PageProps<"/success/plans/[customerId]">): Promise<Metadata> {
  return { title: (await params).customerId };
}

export default function Page({ params }: PageProps<"/success/plans/[customerId]">) {
  return (
    <Suspense fallback={<SuccessSkeleton />}>
      <SuccessPlan params={params} />
    </Suspense>
  );
}
