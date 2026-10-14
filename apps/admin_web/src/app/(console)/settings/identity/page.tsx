import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { IdentitySettings, SettingsNav, SettingsSkeleton } from "@/features/settings/settings";

export const metadata: Metadata = { title: "Identity" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Identity"
        description="Staff identity provider, MFA, sessions, step-up and group to role mapping."
      />
      <SettingsNav current="identity" />
      <Suspense fallback={<SettingsSkeleton />}>
        <IdentitySettings />
      </Suspense>
    </div>
  );
}
