import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Commercial" nav={4} filters={4} metrics={4} columns={7} />;
}
