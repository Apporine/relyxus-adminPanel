import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata: Metadata = { title: "Commercial" };

export default function CommercialPage() {
  return (
    <ModulePlaceholder
      title="Commercial"
      description="Contracts, subscriptions, renewals and value."
      feature="F9"
      screens={["Contract list", "Contract detail", "Renewal radar", "Renewal workspace"]}
    />
  );
}
