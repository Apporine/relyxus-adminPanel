import { KeyRound } from "lucide-react";
import Link from "next/link";
import { FilterFrame, type FilterDefinition } from "@/components/filters/filter-frame";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import {
  allowanceUsage,
  filterLicenses,
  graceEndsAt,
  licenseRiskReasons,
  parseLicenseFilters,
  riskReasonLabel,
} from "@/domain/licensing";
import { licenseState } from "@/domain/status";
import { cn } from "@/lib/cn";
import { formatDate, formatRelativeDays, formatRelativeTime } from "@/lib/format";
import {
  getReferenceTime,
  listCustomers,
  listDeployments,
  listLicenses,
  listProducts,
} from "@/server/data";

const deliveryLabel = {
  pending: "Pending",
  delivered: "Delivered",
  acknowledged: "Acknowledged",
  offline_package: "Offline package",
};

/** License list (spec §15, §30): every column from the §15 list view, URL filters. */
export async function LicenseList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, now, licenses, deployments, customers, products] = await Promise.all([
    searchParams,
    getReferenceTime(),
    listLicenses(),
    listDeployments(),
    listCustomers(),
    listProducts(),
  ]);
  const filters = parseLicenseFilters(
    params,
    products.map((p) => p.id),
  );
  const customerNames = Object.fromEntries(customers.map((c) => [c.id, c.displayName]));
  const productNames = Object.fromEntries(products.map((p) => [p.id, p.name]));
  const visible = filterLicenses(licenses, filters, { deployments, customerNames, now });

  const definitions: FilterDefinition[] = [
    {
      name: "state",
      label: "State",
      allLabel: "Any state",
      options: Object.entries(licenseState).map(([value, p]) => ({ value, label: p.label })),
    },
    {
      name: "product",
      label: "Product",
      allLabel: "All products",
      options: products.map((p) => ({ value: p.id, label: p.name })),
    },
    {
      name: "risk",
      label: "Risk",
      allLabel: "Any risk",
      options: [{ value: "any", label: "Needs attention" }],
    },
    {
      name: "expiring",
      label: "Expires",
      allLabel: "Any date",
      options: [30, 60, 90].map((d) => ({ value: String(d), label: `Within ${d} days` })),
    },
  ];

  return (
    <FilterFrame
      label="License filters"
      filters={definitions}
      values={{
        q: filters.q || undefined,
        state: filters.state,
        product: filters.product,
        risk: filters.risk,
        expiring: filters.expiring ? String(filters.expiring) : undefined,
      }}
      search={{ name: "q", label: "Search", placeholder: "License ID, customer or signing key" }}
    >
      <Card aria-labelledby="license-results" className="mt-6">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="license-results" className="text-card-title">
            Licenses
          </h2>
          <p aria-live="polite" className="text-dense text-fg-muted tabular">
            {visible.length} of {licenses.length} licenses
          </p>
        </div>
        {visible.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No licenses found"
            body="No license matches this view. Change the filters or issue a license from an eligible customer entitlement."
            action={
              <Button asChild variant="link">
                <Link href="/licensing">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <Table label="Licenses" className="whitespace-nowrap">
            <TableHead>
              <TableRow>
                <TableHeaderCell>License</TableHeaderCell>
                <TableHeaderCell>Customer</TableHeaderCell>
                <TableHeaderCell>State</TableHeaderCell>
                <TableHeaderCell>Revision</TableHeaderCell>
                <TableHeaderCell>Valid from</TableHeaderCell>
                <TableHeaderCell>Expires</TableHeaderCell>
                <TableHeaderCell>Deployments</TableHeaderCell>
                <TableHeaderCell>Signing key</TableHeaderCell>
                <TableHeaderCell>Delivery</TableHeaderCell>
                <TableHeaderCell>Last verification</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((license) => {
                const reasons = licenseRiskReasons(license, deployments, now);
                const usage = allowanceUsage(license, deployments);
                const latest = license.revisions.at(-1);
                return (
                  <TableRow key={license.id}>
                    <TableCell>
                      <Link
                        href={`/licensing/${license.id}`}
                        className="font-mono text-micro font-semibold text-fg hover:text-violet-text hover:underline"
                      >
                        {license.id}
                      </Link>
                      <span className="block text-micro text-fg-muted">
                        {productNames[license.productId]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/customers/${license.customerId}?tab=licenses`}
                        className="text-fg hover:text-violet-text hover:underline"
                      >
                        {customerNames[license.customerId]}
                      </Link>
                      {reasons.length ? (
                        <span className="mt-1 flex gap-1">
                          {reasons.map((r) => (
                            <Tag key={r} className="h-5 bg-coral-subtle text-coral-text">
                              {riskReasonLabel[r]}
                            </Tag>
                          ))}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={licenseState[license.state].tone}
                        label={licenseState[license.state].label}
                      />
                    </TableCell>
                    <TableCell className="tabular">{latest?.revision}</TableCell>
                    <TableCell>{formatDate(license.validFrom)}</TableCell>
                    <TableCell>
                      {formatDate(license.expiresAt)}
                      <span className="block text-micro text-fg-muted">
                        {license.state === "grace"
                          ? `grace ends ${formatRelativeDays(graceEndsAt(license), now)}`
                          : formatRelativeDays(license.expiresAt, now)}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn("tabular", usage.exceeded && "font-medium text-coral-text")}
                    >
                      {usage.used} of {usage.allowed}
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-micro">{latest?.signingKeyId}</code>
                    </TableCell>
                    <TableCell>{deliveryLabel[license.deliveryState]}</TableCell>
                    <TableCell>
                      {license.lastVerificationAt ? (
                        <time dateTime={license.lastVerificationAt}>
                          {formatRelativeTime(license.lastVerificationAt, now)}
                        </time>
                      ) : (
                        <span className="text-fg-muted">No signal</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </FilterFrame>
  );
}

export function LicenseListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading licenses" className="flex flex-col gap-6">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-[28rem] w-full" />
    </div>
  );
}
