import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      title="Settings"
      description="Apporine control plane configuration."
      feature="F15"
      screens={[
        "Organization",
        "Identity",
        "Notifications",
        "Integrations",
        "Data policy",
        "Environments",
      ]}
    />
  );
}
