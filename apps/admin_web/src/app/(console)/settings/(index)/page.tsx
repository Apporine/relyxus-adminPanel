import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { OrganizationSettings, SettingsNav, SettingsSkeleton } from "@/features/settings/settings";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Apporine control plane configuration: organization, products and contacts."
      />
      <SettingsNav current="organization" />
      <Suspense fallback={<SettingsSkeleton />}>
        <OrganizationSettings />
      </Suspense>
    </div>
  );
}
