import "server-only";

import { canViewCommercial, worstLicenseState } from "@/domain/customers";
import { computeHealthFactors, healthScore } from "@/domain/health";
import { buildTimeline } from "@/domain/timeline";
import {
  getCurrentStaff,
  getCustomer,
  getReferenceTime,
  getStaffDirectory,
  listAuditEvents,
  listContacts,
  listContracts,
  listCustomers,
  listDeployments,
  listLicenses,
  listProducts,
  listReleases,
  listSuccessMilestones,
  listSupportCases,
  listTasks,
} from "@/server/data";

/** Everything Customer 360 renders for one account, scoped to that customer. */
export async function loadCustomer360(id: string) {
  const customer = await getCustomer(id);
  if (!customer) return undefined;

  const [
    now,
    me,
    staff,
    allCustomers,
    contacts,
    contracts,
    licenses,
    deployments,
    products,
    releases,
    supportCases,
    milestones,
    audit,
    tasks,
  ] = await Promise.all([
    getReferenceTime(),
    getCurrentStaff(),
    getStaffDirectory(),
    listCustomers(),
    listContacts(id),
    listContracts(id),
    listLicenses(id),
    listDeployments(id),
    listProducts(),
    listReleases(),
    listSupportCases(id),
    listSuccessMilestones(id),
    listAuditEvents(id),
    listTasks(),
  ]);

  const factors = computeHealthFactors({
    customer,
    contracts,
    licenses,
    deployments,
    releases,
    contacts,
    supportCases,
    now,
  });

  return {
    now,
    customer,
    staff,
    canViewCommercial: canViewCommercial(me),
    parent: allCustomers.find((c) => c.id === customer.parentId),
    subsidiaries: allCustomers.filter((c) => c.parentId === customer.id),
    contacts,
    contracts,
    licenses,
    worstLicenseState: worstLicenseState(licenses),
    deployments,
    products: products.filter((p) => customer.productIds.includes(p.id)),
    releases,
    supportCases,
    milestones,
    audit,
    tasks: tasks.filter((t) => t.customerId === id),
    factors,
    score: healthScore(factors),
    timeline: buildTimeline({
      customer,
      contracts,
      licenses,
      deployments,
      supportCases,
      milestones,
      audit,
      now,
    }),
  };
}

export type Customer360 = NonNullable<Awaited<ReturnType<typeof loadCustomer360>>>;
