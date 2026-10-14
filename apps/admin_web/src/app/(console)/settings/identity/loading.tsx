import { CardsScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <CardsScreenSkeleton title="Identity" nav={6} cards={2} columns={1} />;
}
