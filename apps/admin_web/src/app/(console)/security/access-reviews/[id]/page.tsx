import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessReviewDetail } from "@/features/security/reviews";
import { SecuritySkeleton } from "@/features/security/security-parts";

export async function generateMetadata({
  params,
}: PageProps<"/security/access-reviews/[id]">): Promise<Metadata> {
  return { title: (await params).id };
}

export default function Page({ params }: PageProps<"/security/access-reviews/[id]">) {
  return (
    <Suspense fallback={<SecuritySkeleton />}>
      <AccessReviewDetail params={params} />
    </Suspense>
  );
}
