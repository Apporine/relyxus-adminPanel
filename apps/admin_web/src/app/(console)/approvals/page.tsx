import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata: Metadata = { title: "Approvals" };

export default function ApprovalsPage() {
  return (
    <ModulePlaceholder
      title="Approvals"
      description="Governed action queue."
      feature="F7"
      screens={["Approval queue", "Approval detail", "My decisions"]}
    />
  );
}
