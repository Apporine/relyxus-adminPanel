import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { IntegrationSettings, SettingsNav, SettingsSkeleton } from "@/features/settings/settings";

export const metadata: Metadata = { title: "Integrations" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integrations"
        description="Connected systems with owner, purpose, scopes, credentials reference, data classes and health."
      />
      <SettingsNav current="integrations" />
      <Suspense fallback={<SettingsSkeleton />}>
        <IntegrationSettings />
      </Suspense>
    </div>
  );
}
