import { KeyRound, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LicenseList, LicenseListSkeleton } from "@/features/licensing/license-list";

export const metadata: Metadata = { title: "Licensing" };

export default function LicensingPage({ searchParams }: PageProps<"/licensing">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Licensing"
        description="Commercial license lifecycle. Signed revisions are immutable; every change is a governed request."
        actions={
          <>
            <Button asChild>
              <Link href="/licensing/verify">
                <ShieldCheck aria-hidden="true" />
                Verify artifact
              </Link>
            </Button>
            <Button asChild variant="primary">
              <Link href="/licensing/issue">
                <KeyRound aria-hidden="true" />
                Issue license
              </Link>
            </Button>
          </>
        }
      />
      <Suspense fallback={<LicenseListSkeleton />}>
        <LicenseList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
