import type { Metadata } from "next";
import { Suspense } from "react";
import { ContractDetail, ContractDetailSkeleton } from "@/features/commercial/contract-detail";

export async function generateMetadata({
  params,
}: PageProps<"/commercial/contracts/[id]">): Promise<Metadata> {
  return { title: (await params).id };
}

export default function Page({ params }: PageProps<"/commercial/contracts/[id]">) {
  return (
    <Suspense fallback={<ContractDetailSkeleton />}>
      <ContractDetail params={params} />
    </Suspense>
  );
}
