import { CardsScreenSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <CardsScreenSkeleton title="Deployments" nav={3} cards={2} columns={1} />;
}
