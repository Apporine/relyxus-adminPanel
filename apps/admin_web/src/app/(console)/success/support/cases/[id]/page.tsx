import type { Metadata } from "next";
import { Suspense } from "react";
import { SuccessSkeleton } from "@/features/success/health";
import { SupportCaseDetail } from "@/features/success/support";

export async function generateMetadata({
  params,
}: PageProps<"/success/support/cases/[id]">): Promise<Metadata> {
  return { title: (await params).id };
}

export default function Page({ params }: PageProps<"/success/support/cases/[id]">) {
  return (
    <Suspense fallback={<SuccessSkeleton />}>
      <SupportCaseDetail params={params} />
    </Suspense>
  );
}
