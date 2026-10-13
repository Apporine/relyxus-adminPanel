import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/feedback";
import { Customer360Header } from "./header";
import { loadCustomer360 } from "./load";
import { CustomerPanel } from "./panels";
import { ActionRail, IdentityRail } from "./rails";
import { CustomerTabNav, customerTabs, parseCustomerTab } from "./tabs";

/**
 * Customer 360 (spec §10, §30.1): header summary, identity and owners on the left, the
 * tab workspace in the middle and next actions and risks on the right. Below 1280 px both
 * rails move under the main workspace (spec §32).
 */
export async function Customer360({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const data = await loadCustomer360(id);
  if (!data) notFound();
  const tab = parseCustomerTab(query.tab);
  const label = customerTabs.find((t) => t.id === tab)?.label;

  return (
    <div className="flex flex-col gap-6">
      <Customer360Header data={data} />
      <CustomerTabNav customerId={data.customer.id} active={tab} />
      <div className="grid gap-6 xl:grid-cols-[15rem_minmax(0,1fr)_17rem]">
        <section aria-label={`${label} section`} className="flex min-w-0 flex-col gap-4 xl:order-2">
          <CustomerPanel tab={tab} data={data} />
        </section>
        <aside aria-label="Customer identity and owners" className="min-w-0 xl:order-1">
          <IdentityRail data={data} />
        </aside>
        <aside aria-label="Next actions and risks" className="min-w-0 xl:order-3">
          <ActionRail data={data} />
        </aside>
      </div>
    </div>
  );
}

export function Customer360Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading customer" className="flex flex-col gap-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
