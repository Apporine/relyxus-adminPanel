import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Integrations" nav={6} columns={6} rows={8} />;
}
