import type { Metadata } from "next";
import { Suspense } from "react";
import { FinanceSkeleton } from "@/features/finance/finance-parts";
import { ReportView } from "@/features/reports/library";
import { getReport } from "@/server/data";

export async function generateMetadata({
  params,
}: PageProps<"/analytics/reports/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: (await getReport(id))?.title ?? id };
}

export default function Page({ params }: PageProps<"/analytics/reports/[id]">) {
  return (
    <Suspense fallback={<FinanceSkeleton />}>
      <ReportView params={params} />
    </Suspense>
  );
}
