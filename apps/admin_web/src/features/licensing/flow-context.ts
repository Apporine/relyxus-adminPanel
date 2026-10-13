import "server-only";

import {
  actionAvailability,
  eligibleApprovers,
  licenseActionPolicy,
  type ActionAvailability,
  type LicenseAction,
  type LicenseActionPolicy,
} from "@/domain/license-actions";
import { deploymentBindings, pendingRequestsFor } from "@/domain/licensing";
import {
  getCurrentStaff,
  getLicense,
  getReferenceTime,
  listApprovals,
  listContracts,
  listCustomers,
  listDeployments,
  listLicenses,
  listProducts,
  listStaff,
} from "@/server/data";

export interface FlowEntitlement {
  key: string;
  label: string;
  value: string;
}

export interface FlowLicense {
  id: string;
  state: string;
  revision: number;
  customerId: string;
  customerName: string;
  productName: string;
  validFrom: string;
  expiresAt: string;
  allowance: number;
  entitlements: FlowEntitlement[];
}

export interface FlowDeployment {
  id: string;
  name: string;
  environment: string;
  match?: "match" | "mismatch" | "unknown";
}

export interface IssueOption {
  contractId: string;
  contractNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  validFrom: string;
  expiresAt: string;
  allowance: number;
  entitlements: FlowEntitlement[];
}

export interface FlowContext {
  action: LicenseAction;
  policy: LicenseActionPolicy;
  availability: ActionAvailability;
  now: string;
  requesterName: string;
  approverNames: string[];
  license?: FlowLicense;
  bindings: FlowDeployment[];
  rebindTargets: FlowDeployment[];
  issueOptions: IssueOption[];
  backHref: string;
}

const environmentLabel: Record<string, string> = {
  production: "Production",
  staging: "Staging",
  dr: "Disaster recovery",
};

function entitlementTemplate(allowance: number, tier: string): FlowEntitlement[] {
  return [
    {
      key: "deployments.production.max",
      label: "Production deployments",
      value: String(allowance),
    },
    { key: "deployments.nonproduction.max", label: "Non-production deployments", value: "4" },
    { key: "support.tier", label: "Support tier", value: tier.replace("_", " ") },
    { key: "modules.ai_routing", label: "AI routing module", value: "Enabled" },
  ];
}

/** Everything a governed license flow needs, as plain data for the client flow. */
export async function loadFlowContext(
  action: LicenseAction,
  licenseId?: string,
): Promise<FlowContext | undefined> {
  const [now, me, staff, products, customers, approvals] = await Promise.all([
    getReferenceTime(),
    getCurrentStaff(),
    listStaff(),
    listProducts(),
    listCustomers(),
    listApprovals(),
  ]);
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id;
  const customerName = (id: string) => customers.find((c) => c.id === id)?.displayName ?? id;
  const base = {
    action,
    policy: licenseActionPolicy[action],
    now,
    requesterName: me.name,
    approverNames: eligibleApprovers(staff, me.id).map((s) => s.name),
  };

  if (action === "issue") {
    const [contracts, licenses] = await Promise.all([listContracts(), listLicenses()]);
    const issueOptions: IssueOption[] = contracts.flatMap((contract) => {
      const customer = customers.find((c) => c.id === contract.customerId);
      if (!customer) return [];
      return contract.productIds
        .filter(
          (productId) =>
            !licenses.some((l) => l.contractId === contract.id && l.productId === productId),
        )
        .map((productId) => {
          const allowance = customer.supportTier === "mission_critical" ? 3 : 2;
          return {
            contractId: contract.id,
            contractNumber: contract.number,
            customerId: customer.id,
            customerName: customer.displayName,
            productId,
            productName: productName(productId),
            validFrom: contract.effectiveAt,
            expiresAt: contract.endsAt,
            allowance,
            entitlements: entitlementTemplate(allowance, customer.supportTier),
          };
        });
    });
    return {
      ...base,
      availability: actionAvailability("issue", me),
      bindings: [],
      rebindTargets: [],
      issueOptions,
      backHref: "/licensing",
    };
  }

  const license = licenseId ? await getLicense(licenseId) : undefined;
  if (!license) return undefined;
  const deployments = await listDeployments(license.customerId);
  const bindings = deploymentBindings(license, deployments);
  const latest = license.revisions.at(-1);

  return {
    ...base,
    availability: actionAvailability(
      action,
      me,
      license,
      pendingRequestsFor(license, approvals)[0],
    ),
    license: {
      id: license.id,
      state: license.state,
      revision: latest?.revision ?? 1,
      customerId: license.customerId,
      customerName: customerName(license.customerId),
      productName: productName(license.productId),
      validFrom: license.validFrom,
      expiresAt: license.expiresAt,
      allowance: license.deploymentAllowance,
      entitlements: latest?.entitlements ?? [],
    },
    bindings: bindings.map((b) => ({
      id: b.deployment.id,
      name: b.deployment.logicalName,
      environment: environmentLabel[b.deployment.environment] ?? b.deployment.environment,
      match: b.match,
    })),
    rebindTargets: deployments
      .filter((d) => d.licenseId !== license.id)
      .map((d) => ({
        id: d.id,
        name: d.logicalName,
        environment: environmentLabel[d.environment] ?? d.environment,
      })),
    issueOptions: [],
    backHref: `/licensing/${license.id}`,
  };
}
