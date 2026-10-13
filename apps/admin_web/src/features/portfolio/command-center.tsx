import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import {
  buildPortfolioSummary,
  healthStatuses,
  healthTrend,
  isFiltered,
  lifecycleStages,
  parsePortfolioFilters,
  regions,
  segments,
} from "@/domain/portfolio";
import { healthStatus, lifecycleStage } from "@/domain/status";
import {
  getAuditActivity,
  getCostImportStatus,
  getCurrentStaff,
  getReferenceTime,
  getStaffDirectory,
  listApprovals,
  listContracts,
  listCostSnapshots,
  listCustomers,
  listDeployments,
  listHealthHistory,
  listLicenseRiskHistory,
  listLicenses,
  listProducts,
  listReleases,
  listStaff,
  listTasks,
} from "@/server/data";
import { FilterFrame, type FilterDefinition } from "@/components/filters/filter-frame";
import {
  AuditActivityCard,
  CostCard,
  HealthCard,
  OperationalInbox,
  ReleaseExposureCard,
  SummaryMetrics,
} from "./widgets";

const segmentLabel = {
  enterprise: "Enterprise",
  mid_market: "Mid market",
  public_sector: "Public sector",
};

/** Portfolio command center body (spec §8, §30.1). Reads the URL filters at request time. */
export async function CommandCenter({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, now, me, products, staff, staffById] = await Promise.all([
    searchParams,
    getReferenceTime(),
    getCurrentStaff(),
    listProducts(),
    listStaff(),
    getStaffDirectory(),
  ]);
  const filters = parsePortfolioFilters(params, {
    productIds: products.map((p) => p.id),
    staffIds: staff.map((s) => s.id),
  });

  const [
    customers,
    contracts,
    licenses,
    deployments,
    releases,
    approvals,
    tasks,
    costs,
    history,
    riskHistory,
    audit,
    costImport,
  ] = await Promise.all([
    listCustomers(),
    listContracts(),
    listLicenses(),
    listDeployments(),
    listReleases(),
    listApprovals(),
    listTasks(),
    listCostSnapshots(),
    listHealthHistory(),
    listLicenseRiskHistory(),
    getAuditActivity(),
    getCostImportStatus(),
  ]);

  const summary = buildPortfolioSummary(
    { customers, contracts, licenses, deployments, releases, approvals, tasks, costs, now },
    filters,
  );
  const customerNames = Object.fromEntries(customers.map((c) => [c.id, c.displayName]));
  const financeScope = me.roles.some((r) => r === "finance_viewer" || r === "executive_viewer");

  const filterDefinitions: FilterDefinition[] = [
    {
      name: "product",
      label: "Product",
      allLabel: "All products",
      options: products.map((p) => ({ value: p.id, label: p.name })),
    },
    {
      name: "segment",
      label: "Customer segment",
      allLabel: "All segments",
      options: segments.map((s) => ({ value: s, label: segmentLabel[s] })),
    },
    {
      name: "stage",
      label: "Lifecycle stage",
      allLabel: "All stages",
      options: lifecycleStages.map((s) => ({ value: s, label: lifecycleStage[s] })),
    },
    {
      name: "region",
      label: "Region",
      allLabel: "All regions",
      options: regions.map((r) => ({ value: r, label: r })),
    },
    {
      name: "owner",
      label: "Owner",
      allLabel: "Any owner",
      options: staff.map((s) => ({ value: s.id, label: s.name })),
    },
    {
      name: "risk",
      label: "Risk",
      allLabel: "Any risk",
      options: healthStatuses.map((h) => ({ value: h, label: healthStatus[h].label })),
    },
    {
      name: "range",
      label: "Date range",
      options: [
        { value: "6m", label: "Last 6 months" },
        { value: "3m", label: "Last 3 months" },
      ],
    },
  ];
  const values = {
    product: filters.product,
    segment: filters.segment,
    stage: filters.stage,
    region: filters.region,
    owner: filters.owner,
    risk: filters.risk,
    range: filters.range,
  };

  return (
    <FilterFrame label="Portfolio filters" filters={filterDefinitions} values={values}>
      {summary.customerCount === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title={isFiltered(filters) ? "No customers match these filters" : "No customers yet"}
            body={
              isFiltered(filters)
                ? "Change or clear the filters to see portfolio metrics."
                : "Create the first customer to begin managing products, contracts, licenses and deployments."
            }
            action={
              <Button asChild variant="primary">
                <Link href={isFiltered(filters) ? "/" : "/customers?create=1"}>
                  {isFiltered(filters) ? "Clear filters" : "Create customer"}
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <SummaryMetrics
            summary={summary}
            licenseRiskTrend={riskHistory.map((r) => r.count)}
            financeScope={financeScope}
          />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="grid min-w-0 content-start gap-6 lg:grid-cols-2">
              <HealthCard
                summary={summary}
                history={healthTrend(history, filters.range)}
                filtered={isFiltered(filters)}
              />
              <ReleaseExposureCard summary={summary} now={now} />
              <CostCard summary={summary} products={products} costImport={costImport} now={now} />
              <AuditActivityCard activity={audit} filtered={isFiltered(filters)} />
            </div>
            <div className="min-w-0">
              <OperationalInbox
                summary={summary}
                customerNames={customerNames}
                staff={staffById}
                now={now}
              />
            </div>
          </div>
        </div>
      )}
    </FilterFrame>
  );
}

export function CommandCenterSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading portfolio" className="flex flex-col gap-6">
      <Skeleton className="h-14 w-full" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
        <Skeleton className="h-[32rem]" />
      </div>
    </div>
  );
}
