import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata: Metadata = { title: "Success" };

export default function SuccessPage() {
  return (
    <ModulePlaceholder
      title="Success"
      description="Customer success and support."
      feature="F11"
      screens={[
        "Health overview",
        "Customer health detail",
        "Success plan",
        "QBR record",
        "Risk register",
        "Support overview",
        "Escalation workspace",
        "SLA report",
      ]}
    />
  );
}
