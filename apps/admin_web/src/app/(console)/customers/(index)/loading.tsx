import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListScreenSkeleton title="Customers" nav={5} filters={6} columns={8} rows={10} />;
}
