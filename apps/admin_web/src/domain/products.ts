import { sumByCurrency } from "./money";
import type { Contract, Customer, Deployment, License, Money, Product, SupportCase } from "./types";

const DAY_MS = 86_400_000;
/** Renewal exposure looks this far ahead, matching the renewal radar (spec §19). */
export const RENEWAL_EXPOSURE_DAYS = 120;

export interface ProductContext {
  customers: Customer[];
  contracts: Contract[];
  licenses: License[];
  deployments: Deployment[];
  cases: SupportCase[];
  now: string;
}

const LIVE_LICENSE = new Set<License["state"]>(["active", "grace"]);

function endsWithin(contract: Contract, now: string, days: number): boolean {
  const left = (Date.parse(contract.endsAt) - Date.parse(now)) / DAY_MS;
  return left >= 0 && left <= days;
}

export interface ProductCustomerRow {
  customer: Customer;
  annualContractValue?: Money;
  activeLicenses: number;
  deployments: number;
  /** Contract end date when it falls inside the renewal exposure window. */
  renewalAt?: string;
  openCases: number;
}

/** Product customers (spec §9): one row per customer that holds the product. */
export function productCustomers(product: Product, ctx: ProductContext): ProductCustomerRow[] {
  return ctx.customers
    .filter((c) => c.productIds.includes(product.id))
    .map((customer) => {
      const contract = ctx.contracts.find(
        (k) => k.customerId === customer.id && k.productIds.includes(product.id),
      );
      return {
        customer,
        annualContractValue: contract?.annualContractValue,
        activeLicenses: ctx.licenses.filter(
          (l) =>
            l.customerId === customer.id && l.productId === product.id && LIVE_LICENSE.has(l.state),
        ).length,
        deployments: ctx.deployments.filter(
          (d) => d.customerId === customer.id && d.productId === product.id,
        ).length,
        renewalAt:
          contract && endsWithin(contract, ctx.now, RENEWAL_EXPOSURE_DAYS)
            ? contract.endsAt
            : undefined,
        openCases: ctx.cases.filter((s) => s.customerId === customer.id && s.status !== "resolved")
          .length,
      };
    })
    .sort((a, b) => a.customer.displayName.localeCompare(b.customer.displayName));
}

export interface ProductSummary {
  customers: number;
  activeCustomers: number;
  annualContractValue: Money[];
  activeLicenses: number;
  deployments: number;
  productionDeployments: number;
  renewalExposure: Money[];
  renewalsDue: number;
  openCases: number;
}

/** Product overview and customers headline (spec §9); money stays per currency. */
export function productSummary(product: Product, ctx: ProductContext): ProductSummary {
  const rows = productCustomers(product, ctx);
  const contracts = ctx.contracts.filter((k) => k.productIds.includes(product.id));
  const exposed = contracts.filter((k) => endsWithin(k, ctx.now, RENEWAL_EXPOSURE_DAYS));
  const deployments = ctx.deployments.filter((d) => d.productId === product.id);
  return {
    customers: rows.length,
    activeCustomers: rows.filter((r) => r.customer.status === "active").length,
    annualContractValue: sumByCurrency(contracts.map((k) => k.annualContractValue)),
    activeLicenses: rows.reduce((n, r) => n + r.activeLicenses, 0),
    deployments: deployments.length,
    productionDeployments: deployments.filter((d) => d.environment === "production").length,
    renewalExposure: sumByCurrency(exposed.map((k) => k.annualContractValue)),
    renewalsDue: exposed.length,
    openCases: rows.reduce((n, r) => n + r.openCases, 0),
  };
}
