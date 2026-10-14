import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <ListScreenSkeleton title="Success and support" nav={6} metrics={4} columns={6} rows={4} />
  );
}
