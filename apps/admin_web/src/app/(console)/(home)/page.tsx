import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CommandCenter, CommandCenterSkeleton } from "@/features/portfolio/command-center";
import { CommandCenterActions } from "@/features/portfolio/header-actions";
import { listCustomers, listStaff } from "@/server/data";

export const metadata: Metadata = { title: "Portfolio command center" };

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [customers, staff] = await Promise.all([listCustomers(), listStaff()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Portfolio command center"
        description="What needs attention today, what is changing and where risk is accumulating."
        actions={<CommandCenterActions customers={customers} staff={staff} />}
      />
      <Suspense fallback={<CommandCenterSkeleton />}>
        <CommandCenter searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
