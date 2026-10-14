import { DashboardScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <DashboardScreenSkeleton title="Portfolio command center" filters={4} metrics={6} charts={2} />
  );
}
