import { CardsScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <CardsScreenSkeleton title="Environments" nav={6} cards={3} />;
}
