import { DashboardScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <DashboardScreenSkeleton title="Signing keys" nav={8} metrics={0} charts={1} />;
}
