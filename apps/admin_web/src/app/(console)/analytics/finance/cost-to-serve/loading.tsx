import { DashboardScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <DashboardScreenSkeleton title="Cost to serve" nav={6} metrics={4} charts={2} />;
}
