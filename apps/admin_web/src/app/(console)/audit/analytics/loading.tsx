import { DashboardScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <DashboardScreenSkeleton title="Audit analytics" nav={3} filters={8} metrics={4} charts={1} />
  );
}
