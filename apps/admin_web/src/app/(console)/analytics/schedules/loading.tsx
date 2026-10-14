import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Scheduled reports" nav={6} columns={7} rows={5} />;
}
