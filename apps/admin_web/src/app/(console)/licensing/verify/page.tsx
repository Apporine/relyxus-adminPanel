import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/feedback";
import { VerifyPage } from "@/features/licensing/verify-page";

export const metadata: Metadata = { title: "Verify artifact" };

export default function VerifyArtifactPage({ searchParams }: PageProps<"/licensing/verify">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <VerifyPage searchParams={searchParams} />
    </Suspense>
  );
}
