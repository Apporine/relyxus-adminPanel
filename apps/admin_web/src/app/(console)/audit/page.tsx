import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata: Metadata = { title: "Audit" };

export default function AuditPage() {
  return (
    <ModulePlaceholder
      title="Audit"
      description="Searchable administrative evidence."
      feature="F13"
      screens={["Audit log", "Audit analytics", "Export center"]}
    />
  );
}
