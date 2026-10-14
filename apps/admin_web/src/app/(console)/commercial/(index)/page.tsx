import { FilePlus2 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CommercialNav, CreateContract } from "@/features/commercial/commercial-parts";
import { ContractList, ContractListSkeleton } from "@/features/commercial/contract-list";

export const metadata: Metadata = { title: "Commercial" };

export default function Page({ searchParams }: PageProps<"/commercial">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Commercial"
        description="Contracts, renewals and entitlements. Operating metadata only; billing and accounting stay in the finance systems."
        actions={
          <Suspense
            fallback={
              <Button variant="primary">
                <FilePlus2 aria-hidden="true" />
                Create contract
              </Button>
            }
          >
            <CreateContract searchParams={searchParams} />
          </Suspense>
        }
      />
      <CommercialNav current="contracts" />
      <Suspense fallback={<ContractListSkeleton />}>
        <ContractList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
