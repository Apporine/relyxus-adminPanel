import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Access reviews" nav={8} columns={6} rows={3} />;
}
