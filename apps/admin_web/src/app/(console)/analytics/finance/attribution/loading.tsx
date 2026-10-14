import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Cost attribution" nav={6} metrics={3} columns={5} />;
}
