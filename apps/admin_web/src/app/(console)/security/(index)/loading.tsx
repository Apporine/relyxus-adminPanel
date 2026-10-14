import { DashboardScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <DashboardScreenSkeleton title="Security posture" nav={8} metrics={4} charts={2} />;
}
