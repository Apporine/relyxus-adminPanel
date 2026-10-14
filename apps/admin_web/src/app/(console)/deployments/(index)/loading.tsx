import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <ListScreenSkeleton title="Deployments" nav={3} filters={6} metrics={4} columns={8} rows={10} />
  );
}
