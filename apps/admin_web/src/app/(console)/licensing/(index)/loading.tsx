import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Licensing" filters={5} metrics={4} columns={8} actions={2} />;
}
