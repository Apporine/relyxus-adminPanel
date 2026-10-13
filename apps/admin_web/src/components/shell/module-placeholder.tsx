import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";

/**
 * Routed placeholder for modules scheduled in later design-track features, so navigation
 * and search never lead to a dead end.
 */
export function ModulePlaceholder({
  title,
  description,
  screens,
  feature,
}: {
  title: string;
  description: string;
  /** Required screens from spec §30 that this module will provide. */
  screens: string[];
  /** Implementation plan feature that delivers the module, such as "F8". */
  feature: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState
          icon={Construction}
          title={`Scheduled for ${feature}`}
          body={`This module is designed in a later feature of the implementation plan. Planned screens: ${screens.join(", ")}.`}
        />
      </Card>
    </div>
  );
}
