import { DetailScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <DetailScreenSkeleton label="release" tabs={3} metrics={4} />;
}
