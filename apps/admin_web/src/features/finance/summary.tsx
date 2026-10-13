import { CalendarClock, Coins, PieChart, ScrollText } from "lucide-react";
import Link from "next/link";
import { BarList } from "@/components/charts/simple-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { concentration, renewalPipeline, toGbp } from "@/domain/finance";
import { sumByCurrency } from "@/domain/money";
import { healthStatus } from "@/domain/status";
import { formatDate, formatMoneyList, formatPercent, plural } from "@/lib/format";
import { FinanceRestricted, gbpCompact, SourceNotices } from "./finance-parts";
import { loadFinance } from "./load";

const YEAR = 365.25 * 86_400_000;

/**
 * Commercial summary (spec §22): contract value, renewal pipeline, revenue concentration
 * and support efficiency. Other currencies are converted only at finance-approved rates.
 */
export async function CommercialSummary() {
  const data = await loadFinance();
  if (!data.canView) return <FinanceRestricted />;

  const live = data.contracts.filter((c) => c.status === "active" || c.status === "renewing");
  const acvByCurrency = sumByCurrency(live.map((c) => c.annualContractValue));
  const acvGbp = live.reduce((sum, c) => sum + toGbp(c.annualContractValue, data.fx), 0);
  const tcvGbp = live.reduce(
    (sum, c) =>
      sum +
      toGbp(c.annualContractValue, data.fx) *
        ((Date.parse(c.endsAt) - Date.parse(c.effectiveAt)) / YEAR),
    0,
  );
  const pipeline = renewalPipeline(data.contracts, data.customers, data.fx, data.now);
  const byCustomer = concentration(
    live.map((c) => ({ key: c.customerId, value: toGbp(c.annualContractValue, data.fx) })),
  );
  const byProduct = concentration(
    Object.entries(
      live.reduce<Record<string, number>>((acc, c) => {
        const key = c.productIds.map((p) => data.productName[p]).join(" + ");
        acc[key] = (acc[key] ?? 0) + toGbp(c.annualContractValue, data.fx);
        return acc;
      }, {}),
    ).map(([key, value]) => ({ key, value })),
  );
  const top = byCustomer.shares[0];
  const efficiency = data.rows
    .filter((r) => r.acvGbp && r.supportHours)
    .map((r) => ({ ...r, perHundredK: (r.supportHours * 12) / (r.acvGbp! / 10_000_000) }))
    .sort((a, b) => b.perHundredK - a.perHundredK);

  return (
    <div className="flex flex-col gap-6">
      <SourceNotices data={data} uses={["finance"]} />
      <section
        aria-label="Commercial summary"
        className="grid stagger grid-cols-2 gap-4 xl:grid-cols-4"
      >
        <MetricCard
          label="Annual contract value"
          value={gbpCompact(acvGbp)}
          detail={formatMoneyList(acvByCurrency)}
          href="/commercial"
          source={`Active contract records; GBP at ${data.fx.source.toLowerCase()} (${formatDate(data.fx.asOf)})`}
          icon={<Coins />}
        />
        <MetricCard
          label="Total contract value"
          value={gbpCompact(tcvGbp)}
          detail={`${plural(live.length, "active contract")} over their terms`}
          href="/commercial"
          source="Annual value times contract term"
          icon={<ScrollText />}
        />
        <MetricCard
          label="Renewing in 90 days"
          value={gbpCompact(pipeline[0]!.value)}
          detail={`${gbpCompact(pipeline[0]!.atRiskValue)} at risk`}
          href="/commercial/renewals"
          source="Contracts ending within 90 days, by customer health"
          icon={<CalendarClock />}
        />
        <MetricCard
          label="Largest customer share"
          value={formatPercent(top?.share ?? 0)}
          detail={`Top five hold ${formatPercent(byCustomer.topFiveShare)}`}
          href="#concentration"
          source="Share of active annual contract value"
          icon={<PieChart />}
        />
      </section>

      <Card aria-labelledby="pipeline-title">
        <CardHeader>
          <div>
            <CardTitle id="pipeline-title">Renewal pipeline</CardTitle>
            <CardDescription>
              Contract value renewing by window. At risk means the customer is at risk or critical.
            </CardDescription>
          </div>
        </CardHeader>
        <Table label="Renewal pipeline" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Window</TableHeaderCell>
              <TableHeaderCell className="text-end">Contracts</TableHeaderCell>
              <TableHeaderCell className="text-end">Value (GBP)</TableHeaderCell>
              <TableHeaderCell className="text-end">At risk (GBP)</TableHeaderCell>
              <TableHeaderCell>Customers</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pipeline.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{w.label}</TableCell>
                <TableCell className="text-end tabular">{w.contracts.length}</TableCell>
                <TableCell className="text-end tabular">{gbpCompact(w.value)}</TableCell>
                <TableCell
                  className={
                    w.atRiskValue
                      ? "text-end font-medium text-coral-text tabular"
                      : "text-end tabular"
                  }
                >
                  {gbpCompact(w.atRiskValue)}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <span className="flex flex-wrap gap-x-3 gap-y-1">
                    {w.contracts.map((c) => {
                      const customer = data.customerById[c.customerId];
                      return (
                        <Link
                          key={c.id}
                          href={`/commercial/renewals/${c.id}`}
                          className="inline-flex min-h-6 items-center gap-1 hover:text-violet-text hover:underline"
                        >
                          {customer?.displayName}
                          <span className="text-micro text-fg-muted">
                            {" "}
                            · {formatDate(c.endsAt)}
                            {customer &&
                            (customer.health === "at_risk" || customer.health === "critical")
                              ? ` · ${healthStatus[customer.health].label}`
                              : ""}
                          </span>
                        </Link>
                      );
                    })}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div id="concentration" className="grid scroll-mt-20 gap-4 xl:grid-cols-2">
        <Card aria-labelledby="by-customer-title">
          <CardHeader>
            <div>
              <CardTitle id="by-customer-title">Revenue concentration by customer</CardTitle>
              <CardDescription>
                HHI {byCustomer.hhi.toLocaleString("en-GB")} of 10,000;{" "}
                {byCustomer.hhi > 2_500
                  ? "highly concentrated"
                  : byCustomer.hhi > 1_500
                    ? "moderately concentrated"
                    : "not concentrated"}
                .
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BarList
              max={byCustomer.shares[0]?.share}
              items={byCustomer.shares.slice(0, 8).map((s) => ({
                key: s.key,
                label: data.customerById[s.key]?.displayName ?? s.key,
                value: s.share,
                valueLabel: formatPercent(s.share),
                note: gbpCompact(s.value),
                href: `/customers/${s.key}?tab=contracts`,
                accessibleLabel: `${data.customerById[s.key]?.displayName}: ${formatPercent(s.share)} of contract value`,
              }))}
            />
          </CardContent>
        </Card>
        <Card aria-labelledby="by-product-title">
          <CardHeader>
            <div>
              <CardTitle id="by-product-title">Revenue concentration by product</CardTitle>
              <CardDescription>
                Bundled contracts are shown as their own line; their value is not split.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BarList
              max={1}
              items={byProduct.shares.map((s) => ({
                key: s.key,
                label: s.key,
                value: s.share,
                valueLabel: formatPercent(s.share),
                note: gbpCompact(s.value),
                href: "/products",
                accessibleLabel: `${s.key}: ${formatPercent(s.share)} of contract value`,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card aria-labelledby="efficiency-title">
        <CardHeader>
          <div>
            <CardTitle id="efficiency-title">Support efficiency</CardTitle>
            <CardDescription>
              Annualized support hours per £100k of contract value, from approved time records.
            </CardDescription>
          </div>
        </CardHeader>
        <Table label="Support efficiency" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Support tier</TableHeaderCell>
              <TableHeaderCell className="text-end">Support hours (month)</TableHeaderCell>
              <TableHeaderCell className="text-end">Contract value (GBP)</TableHeaderCell>
              <TableHeaderCell className="text-end">Hours per £100k a year</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {efficiency.map((r) => {
              const customer = data.customerById[r.customerId]!;
              return (
                <TableRow key={r.customerId}>
                  <TableCell>
                    <Link
                      href={`/customers/${r.customerId}?tab=support`}
                      className="font-medium text-fg hover:text-violet-text hover:underline"
                    >
                      {customer.displayName}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">
                    {customer.supportTier.replaceAll("_", " ")}
                  </TableCell>
                  <TableCell className="text-end tabular">{r.supportHours}</TableCell>
                  <TableCell className="text-end tabular">{gbpCompact(r.acvGbp!)}</TableCell>
                  <TableCell className="text-end tabular">{Math.round(r.perHundredK)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
