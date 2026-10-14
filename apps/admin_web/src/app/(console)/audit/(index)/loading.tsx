import { ListScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <ListScreenSkeleton title="Audit log" nav={3} filters={8} columns={11} rows={12} actions={3} />
  );
}
