import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="API clients" nav={8} columns={8} rows={7} />;
}
