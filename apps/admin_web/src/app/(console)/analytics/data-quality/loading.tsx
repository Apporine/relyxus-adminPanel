import { DashboardScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <DashboardScreenSkeleton title="Data quality" nav={6} metrics={4} charts={0} />;
}
