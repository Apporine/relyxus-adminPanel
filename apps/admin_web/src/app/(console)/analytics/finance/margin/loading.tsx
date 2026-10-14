import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Margin estimate" nav={6} columns={5} rows={10} />;
}
