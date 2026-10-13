import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ApprovalQueue, ApprovalQueueSkeleton } from "@/features/approvals/approval-queue";

export const metadata: Metadata = { title: "Approvals" };

export default function ApprovalsPage({ searchParams }: PageProps<"/approvals">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Approvals"
        description="Governed requests waiting for a second person. Every decision is final and recorded in audit."
        actions={
          <Button asChild>
            <Link href="/approvals/decisions">
              <History aria-hidden="true" />
              My decisions
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<ApprovalQueueSkeleton />}>
        <ApprovalQueue searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
