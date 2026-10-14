import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Commercial" nav={4} metrics={3} columns={6} />;
}
