import type { Metadata } from "next";
import { Suspense } from "react";
import {
  RenewalWorkspace,
  RenewalWorkspaceSkeleton,
} from "@/features/commercial/renewal-workspace";

export async function generateMetadata({
  params,
}: PageProps<"/commercial/renewals/[id]">): Promise<Metadata> {
  return { title: (await params).id };
}

export default function Page({ params }: PageProps<"/commercial/renewals/[id]">) {
  return (
    <Suspense fallback={<RenewalWorkspaceSkeleton />}>
      <RenewalWorkspace params={params} />
    </Suspense>
  );
}
