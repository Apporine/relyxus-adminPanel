import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AddDeployment } from "@/features/fleet/add-deployment";
import { DeploymentsNav } from "@/features/fleet/fleet-parts";
import { FleetList, FleetListSkeleton } from "@/features/fleet/fleet-list";

export const metadata: Metadata = { title: "Deployments" };

export default function DeploymentsPage({ searchParams }: PageProps<"/deployments">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Deployments"
        description="Customer authorized installations: release, support and license state from approved metadata only."
        actions={
          <Suspense
            fallback={
              <Button variant="primary">
                <Plus aria-hidden="true" />
                Add deployment
              </Button>
            }
          >
            <AddDeployment searchParams={searchParams} />
          </Suspense>
        }
      />
      <DeploymentsNav current="fleet" />
      <Suspense fallback={<FleetListSkeleton />}>
        <FleetList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
