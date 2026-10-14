import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { EnvironmentSettings, SettingsNav, SettingsSkeleton } from "@/features/settings/settings";

export const metadata: Metadata = { title: "Environments" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Environments"
        description="Production, staging and development: where each runs, its data and who has access."
      />
      <SettingsNav current="environments" />
      <Suspense fallback={<SettingsSkeleton />}>
        <EnvironmentSettings />
      </Suspense>
    </div>
  );
}
