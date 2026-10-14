import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Approvals" nav={6} columns={6} rows={6} />;
}
