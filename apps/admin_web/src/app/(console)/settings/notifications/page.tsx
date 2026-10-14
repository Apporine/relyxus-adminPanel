import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationSettings, SettingsNav, SettingsSkeleton } from "@/features/settings/settings";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications and automation"
        description="Approved channels and the automation rules that create tasks and notify owners."
      />
      <SettingsNav current="notifications" />
      <Suspense fallback={<SettingsSkeleton />}>
        <NotificationSettings />
      </Suspense>
    </div>
  );
}
