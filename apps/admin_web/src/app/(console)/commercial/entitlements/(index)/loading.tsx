import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Commercial" nav={4} columns={7} rows={10} />;
}
