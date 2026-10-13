import Link from "next/link";
import { Skeleton, Notice } from "@/components/ui/feedback";
import { buildCustomerRows, canViewCommercial, parseCustomerFilters } from "@/domain/customers";
import { formatRelativeTime } from "@/lib/format";
import {
  getCrmSyncStatus,
  getCurrentStaff,
  getReferenceTime,
  listCustomers,
  listDeployments,
  listLicenses,
  listProducts,
  listStaff,
} from "@/server/data";
import { CustomerTable } from "./customer-table";

const CRM_STALE_AFTER_MS = 24 * 3_600_000;

/** Customer list body (spec §30.1). Reads URL filters at request time. */
export async function CustomerList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, now, me, customers, products, licenses, deployments, staff, crm] =
    await Promise.all([
      searchParams,
      getReferenceTime(),
      getCurrentStaff(),
      listCustomers(),
      listProducts(),
      listLicenses(),
      listDeployments(),
      listStaff(),
      getCrmSyncStatus(),
    ]);

  const rows = buildCustomerRows({ customers, products, licenses, deployments, now });
  const ownerNames = Object.fromEntries(staff.map((s) => [s.id, s.name]));
  const names = Object.fromEntries(customers.map((c) => [c.id, c.displayName]));
  const duplicates = rows.filter((r) => r.duplicateOfId);
  const commercial = canViewCommercial(me);
  const crmStale = Date.parse(now) - Date.parse(crm.lastSyncedAt) > CRM_STALE_AFTER_MS;

  return (
    <div className="flex flex-col gap-4">
      {crmStale || duplicates.length > 0 || !commercial ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {crmStale ? (
            <Notice tone="risk" title={`${crm.system} sync delayed`}>
              Last successful sync {formatRelativeTime(crm.lastSyncedAt, now)}. Identity fields
              owned by the CRM may be out of date; edit them in {crm.system}, not here.
            </Notice>
          ) : null}
          {duplicates.length > 0 ? (
            <Notice tone="risk" title="Possible duplicate customers">
              {duplicates.map((d, i) => (
                <span key={d.id}>
                  {i > 0 ? "; " : null}
                  <Link href={`/customers/${d.id}`} className="font-medium text-fg underline">
                    {d.name}
                  </Link>{" "}
                  may duplicate{" "}
                  <Link
                    href={`/customers/${d.duplicateOfId}`}
                    className="font-medium text-fg underline"
                  >
                    {names[d.duplicateOfId ?? ""]}
                  </Link>
                </span>
              ))}
              . Review before merging; records are never merged automatically.
            </Notice>
          ) : null}
          {!commercial ? (
            <Notice title="Commercial fields hidden">
              Contract value requires finance or commercial read access.
            </Notice>
          ) : null}
        </div>
      ) : null}
      <CustomerTable
        rows={rows}
        ownerNames={ownerNames}
        productOptions={products.map((p) => ({ value: p.id, label: p.name }))}
        ownerOptions={staff.map((s) => ({ value: s.id, label: s.name }))}
        canViewCommercial={commercial}
        initialFilters={parseCustomerFilters(params, {
          productIds: products.map((p) => p.id),
          staffIds: staff.map((s) => s.id),
        })}
        now={now}
      />
    </div>
  );
}

export function CustomerListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading customers"
      className="grid gap-6 lg:grid-cols-[15rem_1fr]"
    >
      <Skeleton className="h-96" />
      <Skeleton className="h-[32rem]" />
    </div>
  );
}
