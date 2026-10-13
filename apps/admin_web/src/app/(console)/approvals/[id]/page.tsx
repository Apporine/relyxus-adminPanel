import type { Metadata } from "next";
import { Suspense } from "react";
import { ApprovalDetail, ApprovalDetailSkeleton } from "@/features/approvals/approval-detail";

export async function generateMetadata({
  params,
}: PageProps<"/approvals/[id]">): Promise<Metadata> {
  return { title: (await params).id };
}

export default function ApprovalPage({ params }: PageProps<"/approvals/[id]">) {
  return (
    <Suspense fallback={<ApprovalDetailSkeleton />}>
      <ApprovalDetail params={params} />
    </Suspense>
  );
}
