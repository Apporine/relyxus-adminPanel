import "server-only";

import { computeHealthFactors, healthScore } from "@/domain/health";
import {
  getReferenceTime,
  getStaffDirectory,
  listContacts,
  listContracts,
  listCustomers,
  listDeployments,
  listHealthOverrides,
  listLicenses,
  listOnboardingItems,
  listProducts,
  listQbrs,
  listReleases,
  listRiskRegister,
  listSuccessGoals,
  listSuccessMilestones,
  listSupportCases,
} from "@/server/data";

/**
 * One snapshot for success and support screens. Every customer is scored with the same
 * explainable health engine Customer 360 uses (spec §19).
 */
export async function loadSuccess() {
  const [
    now,
    staff,
    customers,
    products,
    contacts,
    contracts,
    licenses,
    deployments,
    releases,
    cases,
    goals,
    milestones,
    qbrs,
    risks,
    overrides,
    onboarding,
  ] = await Promise.all([
    getReferenceTime(),
    getStaffDirectory(),
    listCustomers(),
    listProducts(),
    listContacts(),
    listContracts(),
    listLicenses(),
    listDeployments(),
    listReleases(),
    listSupportCases(),
    listSuccessGoals(),
    listSuccessMilestones(),
    listQbrs(),
    listRiskRegister(),
    listHealthOverrides(),
    listOnboardingItems(),
  ]);

  const health = customers.map((customer) => {
    const factors = computeHealthFactors({
      customer,
      contracts: contracts.filter((c) => c.customerId === customer.id),
      licenses: licenses.filter((l) => l.customerId === customer.id),
      deployments: deployments.filter((d) => d.customerId === customer.id),
      releases,
      contacts: contacts.filter((c) => c.customerId === customer.id),
      supportCases: cases.filter((c) => c.customerId === customer.id),
      now,
    });
    return { customer, factors, score: healthScore(factors) };
  });

  return {
    now,
    staff,
    customers,
    products,
    contracts,
    cases,
    goals,
    milestones,
    qbrs,
    risks,
    overrides,
    onboarding,
    health,
    customerById: Object.fromEntries(customers.map((c) => [c.id, c])),
    productNames: Object.fromEntries(products.map((p) => [p.id, p.name])) as Record<string, string>,
  };
}

export type SuccessData = Awaited<ReturnType<typeof loadSuccess>>;
