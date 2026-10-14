import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Sensitive data access" nav={8} columns={6} rows={6} />;
}
