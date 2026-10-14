import { CardsScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <CardsScreenSkeleton title="Data policy" nav={6} cards={3} columns={2} />;
}
