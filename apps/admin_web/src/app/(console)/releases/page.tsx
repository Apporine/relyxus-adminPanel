import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata: Metadata = { title: "Releases" };

export default function ReleasesPage() {
  return (
    <ModulePlaceholder
      title="Releases"
      description="Release metadata and customer impact."
      feature="F8"
      screens={[
        "Release list",
        "Release detail",
        "Compatibility matrix",
        "Customer impact preview",
      ]}
    />
  );
}
