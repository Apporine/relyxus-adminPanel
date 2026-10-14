import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Roles" nav={8} columns={4} rows={10} />;
}
