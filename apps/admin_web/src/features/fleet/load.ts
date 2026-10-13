import "server-only";

import {
  getCurrentStaff,
  getReferenceTime,
  getStaffDirectory,
  listCustomers,
  listDeployments,
  listLicenses,
  listProducts,
  listReleases,
} from "@/server/data";

/** Everything fleet and release screens share: one consistent snapshot of the install base. */
export async function loadFleet() {
  const [now, me, staff, customers, products, deployments, releases, licenses] = await Promise.all([
    getReferenceTime(),
    getCurrentStaff(),
    getStaffDirectory(),
    listCustomers(),
    listProducts(),
    listDeployments(),
    listReleases(),
    listLicenses(),
  ]);
  return {
    now,
    me,
    staff,
    customers,
    products,
    deployments,
    releases,
    licenses,
    customerNames: Object.fromEntries(customers.map((c) => [c.id, c.displayName])) as Record<
      string,
      string
    >,
    productNames: Object.fromEntries(products.map((p) => [p.id, p.name])) as Record<string, string>,
  };
}

export type FleetData = Awaited<ReturnType<typeof loadFleet>>;
