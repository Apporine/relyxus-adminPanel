import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/feedback";
import { ContactDetail } from "@/features/customer-360/contact-detail";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage({ params }: PageProps<"/customers/[id]/contacts/[contactId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <ContactDetail params={params} />
    </Suspense>
  );
}
