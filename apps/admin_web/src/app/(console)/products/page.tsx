import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <ModulePlaceholder
      title="Products"
      description="Manage Apporine product definitions and release trains."
      feature="F10"
      screens={[
        "Product list",
        "Product detail",
        "Entitlement catalog",
        "Product customers",
        "Release train",
      ]}
    />
  );
}
