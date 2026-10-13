import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <ModulePlaceholder
      title="Security"
      description="Internal security administration."
      feature="F12"
      screens={[
        "Staff access",
        "Role detail",
        "Access review",
        "API clients",
        "Signing key metadata",
        "Break glass",
      ]}
    />
  );
}
