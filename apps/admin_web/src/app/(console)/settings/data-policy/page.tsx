import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataPolicySettings, SettingsNav, SettingsSkeleton } from "@/features/settings/settings";

export const metadata: Metadata = { title: "Data policy" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data policy"
        description="Exports, residency, classification and retention."
      />
      <SettingsNav current="data-policy" />
      <Suspense fallback={<SettingsSkeleton />}>
        <DataPolicySettings />
      </Suspense>
    </div>
  );
}
