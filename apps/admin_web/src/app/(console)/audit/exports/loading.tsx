import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Export center" nav={3} metrics={0} columns={8} rows={6} />;
}
