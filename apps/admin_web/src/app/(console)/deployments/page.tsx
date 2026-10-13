import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata: Metadata = { title: "Deployments" };

export default function DeploymentsPage() {
  return (
    <ModulePlaceholder
      title="Deployments"
      description="Install base and environment governance."
      feature="F8"
      screens={["Fleet list", "Deployment detail", "Release heatmap", "Upgrade readiness"]}
    />
  );
}
