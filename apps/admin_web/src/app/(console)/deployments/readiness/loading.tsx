import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Deployments" nav={3} metrics={4} columns={6} />;
}
