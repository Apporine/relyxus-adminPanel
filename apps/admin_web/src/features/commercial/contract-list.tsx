import { FileText } from "lucide-react";
import Link from "next/link";
import { FilterFrame, type FilterDefinition } from "@/components/filters/filter-frame";
import { StatusBadge } from "@/components/ui/badge";
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
import { sumByCurrency } from "@/domain/money";
import { daysToEnd, noticePassed, parseRadarWindow, RADAR_WINDOWS } from "@/domain/renewals";
import { contractStatus, renewalStage } from "@/domain/status";
import type { ContractStatus } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatDate, formatMoneyCompact, formatMoneyList } from "@/lib/format";
import { loadCommercial } from "./load";

/** Contract list (spec §13, §30): status, value, dates, notice and renewal owner. */
export async function ContractList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, data] = await Promise.all([searchParams, loadCommercial()]);
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const status = (Object.keys(contractStatus) as ContractStatus[]).find(
    (s) => s === first(params.status),
  );
  const renewal = parseRadarWindow(params.renewal);
  const product = data.products.find((p) => p.id === first(params.product))?.id;
  const owner = Object.keys(data.staff).find((id) => id === first(params.owner));

  const visible = data.contracts
    .filter((c) => {
      if (status && c.status !== status) {
        // "Active" on the command center counts contracts in force, including renewing ones.
        if (!(status === "active" && c.status === "renewing")) return false;
      }
      if (renewal) {
        const days = daysToEnd(c, data.now);
        if (days < 0 || days > renewal) return false;
      }
      if (product && !c.productIds.includes(product)) return false;
      if (owner && c.renewalOwnerId !== owner) return false;
      return true;
    })
    .sort((a, b) => a.endsAt.localeCompare(b.endsAt));

  const definitions: FilterDefinition[] = [
    {
      name: "status",
      label: "Status",
      allLabel: "Any status",
      options: Object.entries(contractStatus).map(([value, p]) => ({ value, label: p.label })),
    },
    {
      name: "renewal",
      label: "Ends within",
      allLabel: "Any date",
      options: RADAR_WINDOWS.map((w) => ({ value: String(w), label: `${w} days` })),
    },
    {
      name: "product",
      label: "Product",
      allLabel: "All products",
      options: data.products.map((p) => ({ value: p.id, label: p.name })),
    },
    {
      name: "owner",
      label: "Renewal owner",
      allLabel: "Any owner",
      options: [...new Set(data.contracts.map((c) => c.renewalOwnerId))].map((id) => ({
        value: id,
        label: data.staff[id]?.name ?? id,
      })),
    },
  ];
  const total = sumByCurrency(visible.map((c) => c.annualContractValue));

  return (
    <FilterFrame
      label="Contract filters"
      filters={definitions}
      values={{ status, renewal: renewal ? String(renewal) : undefined, product, owner }}
    >
      <Card aria-labelledby="contract-results" className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 id="contract-results" className="text-card-title">
            Contracts
          </h2>
          <p aria-live="polite" className="text-dense text-fg-muted tabular">
            {visible.length} of {data.contracts.length} contracts
            {data.canViewCommercial && total.length ? ` · ${formatMoneyList(total)}` : ""}
          </p>
        </div>
        {visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No contracts match"
            body="Change the filters to see contracts in other states or windows."
            action={
              <Button asChild variant="link">
                <Link href="/commercial">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <Table label="Contracts" className="whitespace-nowrap">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Contract</TableHeaderCell>
                <TableHeaderCell>Customer</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-end">Annual value</TableHeaderCell>
                <TableHeaderCell>Ends</TableHeaderCell>
                <TableHeaderCell>Notice</TableHeaderCell>
                <TableHeaderCell>Renewal</TableHeaderCell>
                <TableHeaderCell>Owner</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((c) => {
                const days = daysToEnd(c, data.now);
                const passed = noticePassed(c, data.now);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/commercial/contracts/${c.id}`}
                        className="font-mono font-semibold text-fg hover:text-violet-text hover:underline"
                      >
                        {c.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/customers/${c.customerId}?tab=contracts`}
                        className="hover:text-violet-text hover:underline"
                      >
                        {data.customerById[c.customerId]?.displayName ?? c.customerId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={contractStatus[c.status].tone}
                        label={contractStatus[c.status].label}
                      />
                    </TableCell>
                    <TableCell className="text-end font-medium text-fg tabular">
                      {data.canViewCommercial
                        ? formatMoneyCompact(c.annualContractValue)
                        : "Restricted"}
                    </TableCell>
                    <TableCell>
                      {formatDate(c.endsAt)}
                      <span className="block text-micro text-fg-muted">
                        {days >= 0 ? `in ${days} days` : "Ended"}
                      </span>
                    </TableCell>
                    <TableCell className={cn(passed && days >= 0 && "font-medium text-coral-text")}>
                      {c.noticeDays} days{passed && days >= 0 ? " · passed" : ""}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/commercial/renewals/${c.id}`}
                        className="hover:text-violet-text hover:underline"
                      >
                        {renewalStage[c.renewalStage]}
                      </Link>
                    </TableCell>
                    <TableCell>{data.staff[c.renewalOwnerId]?.name ?? c.renewalOwnerId}</TableCell>
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

export function ContractListSkeleton() {
  return <Skeleton className="h-96 rounded-card" aria-busy="true" />;
}
