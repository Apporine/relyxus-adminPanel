import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { licenseActions, type LicenseAction } from "@/domain/license-actions";
import { loadFlowContext } from "./flow-context";
import { GovernedFlow } from "./governed-flow";

/** Shared page for Issue, Renew, Replace, Rebind, Suspend and Revoke flows (spec §30). */
export async function LicenseFlowPage({
  params,
}: {
  params: Promise<{ id?: string; action?: string }>;
}) {
  const { id, action: rawAction } = await params;
  const action = (rawAction ?? "issue") as LicenseAction;
  if (!licenseActions.includes(action) || (action === "issue") !== !id) notFound();
  const context = await loadFlowContext(action, id);
  if (!context) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Licensing", href: "/licensing" },
            ...(context.license
              ? [{ label: context.license.id, href: `/licensing/${context.license.id}` }]
              : []),
            { label: context.policy.title },
          ]}
        />
        <PageHeader
          title={context.policy.title}
          description={
            context.license
              ? `${context.license.id} · ${context.license.productName} for ${context.license.customerName}`
              : "Create a signed license from an eligible contract line."
          }
        />
      </div>
      <GovernedFlow context={context} />
    </div>
  );
}

export function LicenseFlowSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-6">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
