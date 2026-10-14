import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Report builder" nav={6} columns={4} rows={10} />;
}
