import type { Metadata } from "next";
import { Suspense } from "react";
import { Customer360, Customer360Skeleton } from "@/features/customer-360/customer-360";
import { getCustomer } from "@/server/data";

export async function generateMetadata({
  params,
}: PageProps<"/customers/[id]">): Promise<Metadata> {
  const customer = await getCustomer((await params).id);
  return { title: customer ? customer.displayName : "Customer not found" };
}

export default function CustomerPage({ params, searchParams }: PageProps<"/customers/[id]">) {
  return (
    <Suspense fallback={<Customer360Skeleton />}>
      <Customer360 params={params} searchParams={searchParams} />
    </Suspense>
  );
}
