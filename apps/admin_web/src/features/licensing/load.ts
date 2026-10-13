import "server-only";

import { actionAvailability, licenseActions, type LicenseAction } from "@/domain/license-actions";
import {
  deploymentBindings,
  licenseRiskReasons,
  pendingRequestsFor,
  selectRevision,
} from "@/domain/licensing";
import {
  getCurrentStaff,
  getCustomer,
  getLicense,
  getReferenceTime,
  getStaffDirectory,
  listApprovals,
  listAuditEvents,
  listContracts,
  listDeployments,
  listProducts,
} from "@/server/data";

/** License detail data: the license, the revision being viewed and its context. */
export async function loadLicense(id: string, requestedRevision?: string | string[]) {
  const license = await getLicense(id);
  if (!license) return undefined;

  const [now, me, staff, customer, products, contracts, deployments, approvals, audit] =
    await Promise.all([
      getReferenceTime(),
      getCurrentStaff(),
      getStaffDirectory(),
      getCustomer(license.customerId),
      listProducts(),
      listContracts(license.customerId),
      listDeployments(license.customerId),
      listApprovals(),
      listAuditEvents(),
    ]);

  const revision = selectRevision(license, requestedRevision);
  const latest = license.revisions.at(-1) ?? revision;
  const pending = pendingRequestsFor(license, approvals);
  const availability = Object.fromEntries(
    licenseActions
      .filter((a) => a !== "issue")
      .map((action) => [action, actionAvailability(action, me, license, pending[0])]),
  ) as Record<Exclude<LicenseAction, "issue">, ReturnType<typeof actionAvailability>>;

  return {
    now,
    me,
    staff,
    license,
    customer,
    product: products.find((p) => p.id === license.productId),
    contract: contracts.find((c) => c.id === license.contractId),
    revision,
    latest,
    isLatest: revision.revision === latest.revision,
    previous: license.revisions.find((r) => r.revision === revision.revision - 1),
    bindings: deploymentBindings(license, deployments),
    risks: licenseRiskReasons(license, deployments, now),
    pending,
    audit: audit.filter(
      (e) => e.objectId === license.id || pending.some((p) => p.id === e.objectId),
    ),
    availability,
  };
}

export type LicenseDetailData = NonNullable<Awaited<ReturnType<typeof loadLicense>>>;
