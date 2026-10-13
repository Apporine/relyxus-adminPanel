import "server-only";

import { canViewCommercial } from "@/domain/customers";
import { deploymentRisks } from "@/domain/fleet";
import { licenseRiskReasons, riskReasonLabel } from "@/domain/licensing";
import {
  getCurrentStaff,
  getReferenceTime,
  getStaffDirectory,
  listContracts,
  listCustomerEntitlements,
  listCustomers,
  listDeployments,
  listEntitlementDefinitions,
  listLicenses,
  listObservedEntitlements,
  listProducts,
  listReleases,
  listSupportCases,
  listTasks,
} from "@/server/data";

/** One snapshot of commercial records shared by contracts, renewals and entitlements. */
export async function loadCommercial() {
  const [
    now,
    me,
    staff,
    customers,
    products,
    contracts,
    licenses,
    deployments,
    releases,
    cases,
    tasks,
    definitions,
    records,
    observed,
  ] = await Promise.all([
    getReferenceTime(),
    getCurrentStaff(),
    getStaffDirectory(),
    listCustomers(),
    listProducts(),
    listContracts(),
    listLicenses(),
    listDeployments(),
    listReleases(),
    listSupportCases(),
    listTasks(),
    listEntitlementDefinitions(),
    listCustomerEntitlements(),
    listObservedEntitlements(),
  ]);
  return {
    now,
    me,
    staff,
    customers,
    products,
    contracts,
    licenses,
    deployments,
    releases,
    cases,
    tasks,
    definitions,
    records,
    observed,
    canViewCommercial: canViewCommercial(me),
    customerById: Object.fromEntries(customers.map((c) => [c.id, c])),
    productNames: Object.fromEntries(products.map((p) => [p.id, p.name])) as Record<string, string>,
  };
}

export type CommercialData = Awaited<ReturnType<typeof loadCommercial>>;

/** Open risks for one customer, in words: license, deployment and SLA risks (spec §19). */
export function openRisks(customerId: string, data: CommercialData): string[] {
  const risks: string[] = [];
  for (const license of data.licenses.filter((l) => l.customerId === customerId)) {
    for (const reason of licenseRiskReasons(license, data.deployments, data.now)) {
      risks.push(`${license.id}: ${riskReasonLabel[reason]}`);
    }
  }
  const context = { releases: data.releases, licenses: data.licenses, now: data.now };
  const atRisk = data.deployments.filter(
    (d) => d.customerId === customerId && deploymentRisks(d, context).length > 0,
  );
  if (atRisk.length) {
    risks.push(`${atRisk.length} deployment${atRisk.length === 1 ? "" : "s"} at risk`);
  }
  const breached = data.cases.filter(
    (c) => c.customerId === customerId && c.status !== "resolved" && c.slaState === "breached",
  );
  if (breached.length) risks.push(`${breached.length} support case SLA breached`);
  return risks;
}
