import { DetailScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <DetailScreenSkeleton label="customer" tabs={8} metrics={6} />;
}
