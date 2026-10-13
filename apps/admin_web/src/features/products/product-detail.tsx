import { Banknote, CalendarClock, KeyRound, LifeBuoy, Server, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableId } from "@/components/ui/copyable-id";
import { DescriptionList } from "@/components/ui/description-list";
import { Skeleton } from "@/components/ui/feedback";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentNav } from "@/components/ui/segment-nav";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { compareVersions, deploymentProfiles, isSupportedRelease } from "@/domain/fleet";
import { productCustomers, productSummary } from "@/domain/products";
import { healthStatus, productStatus } from "@/domain/status";
import type { EntitlementDefinition } from "@/domain/types";
import { formatDate, formatMoneyCompact, formatMoneyList, plural } from "@/lib/format";
import { loadCommercial, type CommercialData } from "../commercial/load";
import { ReleaseStatusBadge, SupportTimeline } from "../fleet/fleet-parts";
import { PromotionStepper } from "../releases/release-parts";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "catalog", label: "Entitlement catalog" },
  { id: "customers", label: "Customers" },
  { id: "releases", label: "Release train" },
] as const;
type ProductTab = (typeof tabs)[number]["id"];

const classificationLabel: Record<EntitlementDefinition["securityClassification"], string> = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
};

/** Product detail (spec §9): overview, entitlement catalog, customers and release train. */
export async function ProductDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query, data] = await Promise.all([params, searchParams, loadCommercial()]);
  const product = data.products.find((p) => p.id === id);
  if (!product) notFound();
  const requested = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab: ProductTab = tabs.find((t) => t.id === requested)?.id ?? "overview";
  const summary = productSummary(product, data);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Products", href: "/products" }, { label: product.name }]} />
        <PageHeader
          title={product.name}
          description={product.supportModel}
          meta={
            <>
              <CopyableId value={product.id} label="Product ID" />
              <StatusBadge
                tone={productStatus[product.status].tone}
                label={productStatus[product.status].label}
              />
              <Tag>{product.code}</Tag>
              <Tag>Release train {product.currentReleaseTrain}</Tag>
            </>
          }
        />
      </div>
      <SegmentNav
        label="Product sections"
        items={tabs.map((t) => ({
          href: `/products/${product.id}?tab=${t.id}`,
          label: t.label,
          current: t.id === tab,
        }))}
      />
      <section aria-label={`${tabs.find((t) => t.id === tab)?.label} section`}>
        {tab === "overview" ? (
          <Overview productId={product.id} summary={summary} data={data} />
        ) : tab === "catalog" ? (
          <Catalog productId={product.id} data={data} />
        ) : tab === "customers" ? (
          <Customers productId={product.id} data={data} />
        ) : (
          <ReleaseTrain productId={product.id} data={data} />
        )}
      </section>
    </div>
  );
}

function Overview({
  productId,
  summary,
  data,
}: {
  productId: string;
  summary: ReturnType<typeof productSummary>;
  data: CommercialData;
}) {
  const product = data.products.find((p) => p.id === productId)!;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid stagger grid-cols-2 gap-4 xl:grid-cols-3">
        <MetricCard
          label="Active customers"
          value={String(summary.activeCustomers)}
          detail={`${summary.customers} including onboarding`}
          href={`/products/${productId}?tab=customers`}
          source="Customers holding this product"
          icon={<Users />}
        />
        <MetricCard
          label="Annual contract value"
          value={
            summary.annualContractValue[0]
              ? formatMoneyCompact(summary.annualContractValue[0])
              : "—"
          }
          detail={
            summary.annualContractValue.length > 1
              ? `+ ${formatMoneyList(summary.annualContractValue.slice(1))} · not FX converted`
              : undefined
          }
          href={`/commercial?product=${productId}`}
          source="Approved contract records"
          restricted={!data.canViewCommercial}
          icon={<Banknote />}
        />
        <MetricCard
          label="Active licenses"
          value={String(summary.activeLicenses)}
          href="/licensing"
          source="Active and grace licenses"
          icon={<KeyRound />}
        />
        <MetricCard
          label="Deployments"
          value={String(summary.deployments)}
          detail={`${summary.productionDeployments} production`}
          href={`/deployments?product=${productId}`}
          source="Registered deployments"
          icon={<Server />}
        />
        <MetricCard
          label="Renewal exposure"
          value={String(summary.renewalsDue)}
          detail={
            data.canViewCommercial && summary.renewalExposure.length
              ? formatMoneyList(summary.renewalExposure)
              : "Contracts ending within 120 days"
          }
          href="/commercial/renewals"
          source="Contracts ending within 120 days"
          icon={<CalendarClock />}
        />
        <MetricCard
          label="Open support cases"
          value={String(summary.openCases)}
          href={`/products/${productId}?tab=customers`}
          source="Support platform references"
          icon={<LifeBuoy />}
        />
      </div>
      <Card aria-labelledby="product-facts">
        <CardHeader>
          <CardTitle id="product-facts">Product record</CardTitle>
        </CardHeader>
        <CardContent>
          <DescriptionList
            columns={2}
            items={[
              { term: "Code", value: <code className="font-mono">{product.code}</code> },
              { term: "Product owner", value: data.staff[product.ownerId]?.name },
              { term: "Support model", value: product.supportModel },
              { term: "Current release train", value: product.currentReleaseTrain },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/** Entitlement catalog (spec §9): stable key, name, type, default, meaning, classification. */
function Catalog({ productId, data }: { productId: string; data: CommercialData }) {
  const definitions = data.definitions.filter((d) => d.productId === productId);
  return (
    <Card>
      <Table label="Entitlement catalog">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Machine key</TableHeaderCell>
            <TableHeaderCell>Display name</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Default</TableHeaderCell>
            <TableHeaderCell>Commercial meaning</TableHeaderCell>
            <TableHeaderCell>Classification</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {definitions.map((d) => (
            <TableRow key={d.id}>
              <TableCell>
                <code className="font-mono text-micro text-fg">{d.key}</code>
              </TableCell>
              <TableCell className="font-medium whitespace-nowrap text-fg">{d.label}</TableCell>
              <TableCell className="capitalize">{d.dataType}</TableCell>
              <TableCell className="font-mono text-micro">{d.defaultValue}</TableCell>
              <TableCell className="min-w-64">{d.description}</TableCell>
              <TableCell>{classificationLabel[d.securityClassification]}</TableCell>
              <TableCell>
                {d.lifecycle === "deprecated" ? (
                  <StatusBadge tone="risk" label="Deprecated" />
                ) : d.lifecycle === "draft" ? (
                  <StatusBadge tone="neutral" label="Draft" />
                ) : (
                  <StatusBadge tone="healthy" label="Active" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {definitions.length === 0 ? (
        <p className="px-4 py-6 text-body text-fg-muted">
          No entitlements defined for this product yet.
        </p>
      ) : null}
    </Card>
  );
}

function Customers({ productId, data }: { productId: string; data: CommercialData }) {
  const product = data.products.find((p) => p.id === productId)!;
  const rows = productCustomers(product, data);
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-card-title">Customers</h2>
        <p className="text-dense text-fg-muted tabular">{plural(rows.length, "customer")}</p>
      </div>
      <Table label={`${product.name} customers`} className="whitespace-nowrap">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Customer</TableHeaderCell>
            <TableHeaderCell>Health</TableHeaderCell>
            <TableHeaderCell className="text-end">Annual value</TableHeaderCell>
            <TableHeaderCell className="text-end">Active licenses</TableHeaderCell>
            <TableHeaderCell className="text-end">Deployments</TableHeaderCell>
            <TableHeaderCell>Renewal exposure</TableHeaderCell>
            <TableHeaderCell className="text-end">Open cases</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.customer.id}>
              <TableCell>
                <Link
                  href={`/customers/${row.customer.id}`}
                  className="font-medium text-fg hover:text-violet-text hover:underline"
                >
                  {row.customer.displayName}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge
                  tone={healthStatus[row.customer.health].tone}
                  label={healthStatus[row.customer.health].label}
                />
              </TableCell>
              <TableCell className="text-end tabular">
                {!data.canViewCommercial
                  ? "Restricted"
                  : row.annualContractValue
                    ? formatMoneyCompact(row.annualContractValue)
                    : "—"}
              </TableCell>
              <TableCell className="text-end tabular">{row.activeLicenses}</TableCell>
              <TableCell className="text-end tabular">{row.deployments}</TableCell>
              <TableCell>{row.renewalAt ? `Ends ${formatDate(row.renewalAt)}` : "—"}</TableCell>
              <TableCell className="text-end tabular">{row.openCases}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/** Release train (spec §9): each release with digest, package, SBOM, signature, window. */
function ReleaseTrain({ productId, data }: { productId: string; data: CommercialData }) {
  const releases = data.releases
    .filter((r) => r.productId === productId)
    .sort((a, b) => compareVersions(b.version, a.version));
  return (
    <ol className="relative flex flex-col gap-4 ps-6 before:absolute before:inset-y-2 before:start-2 before:w-0.5 before:rounded-full before:bg-linear-to-b before:from-violet before:via-chart-primary-2 before:to-border">
      {releases.map((release) => {
        const supported = deploymentProfiles.filter(
          (p) => release.compatibility[p].status !== "unsupported",
        ).length;
        return (
          <li key={release.id} className="relative">
            <span
              aria-hidden="true"
              className="absolute -start-[22px] top-5 size-3.5 rounded-full border-2 border-surface bg-violet shadow-glow"
            />
            <Card className="transition-[transform,box-shadow] duration-(--ap-duration-panel) hover:-translate-y-0.5 hover:shadow-lift">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle>
                    <Link
                      href={`/releases/${release.id}`}
                      className="font-mono text-section-title hover:text-violet-text hover:underline"
                    >
                      {release.version}
                    </Link>
                  </CardTitle>
                  <ReleaseStatusBadge release={release} />
                  <span className="text-micro text-fg-muted">
                    {isSupportedRelease(release, data.now) ? "Supported" : "Not supported"}
                  </span>
                </div>
                <PromotionStepper status={release.status} compact />
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <DescriptionList
                  columns={2}
                  items={[
                    {
                      term: "OCI digest",
                      value: (
                        <CopyableId
                          value={release.ociDigest}
                          label={`OCI digest ${release.version}`}
                        />
                      ),
                    },
                    { term: "Helm package", value: release.helmChartVersion },
                    {
                      term: "SBOM",
                      value: release.sbomRef ? "Published" : undefined,
                    },
                    {
                      term: "Signature and provenance",
                      value: `${release.signed ? "Signed" : "Unsigned"} · ${release.provenance ? "attested" : "no provenance"}`,
                    },
                    {
                      term: "Compatibility",
                      value: `${supported} of ${deploymentProfiles.length} profiles`,
                    },
                  ]}
                />
                <SupportTimeline release={release} now={data.now} />
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-20 w-2/3" />
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}
