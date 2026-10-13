import type { Metadata } from "next";
import { Suspense } from "react";
import { SuccessSkeleton } from "@/features/success/health";
import { QbrDetail } from "@/features/success/plans";

export async function generateMetadata({
  params,
}: PageProps<"/success/qbrs/[id]">): Promise<Metadata> {
  return { title: (await params).id };
}

export default function Page({ params }: PageProps<"/success/qbrs/[id]">) {
  return (
    <Suspense fallback={<SuccessSkeleton />}>
      <QbrDetail params={params} />
    </Suspense>
  );
}
