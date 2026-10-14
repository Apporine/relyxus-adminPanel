import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Break glass" nav={8} columns={9} rows={4} />;
}
