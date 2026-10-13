import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <ModulePlaceholder
      title="Customers"
      description="Customer 360 and lifecycle management."
      feature="F5"
      screens={[
        "Customer list",
        "Customer 360",
        "Contact detail",
        "Account relationship map",
        "Customer timeline",
      ]}
    />
  );
}
