import type {
  CustomerEntitlement,
  EntitlementDefinition,
  ObservedEntitlement,
} from "@/domain/types";
import { contracts, deployments, licenses } from "./commercial";

export const entitlementDefinitions: EntitlementDefinition[] = [
  {
    id: "ent_def_prod_max",
    productId: "prd_relyxus",
    key: "deployments.production.max",
    label: "Production deployments",
    dataType: "integer",
    validation: "1 to 10",
    defaultValue: "1",
    description: "Production and disaster recovery installations the customer may run.",
    lifecycle: "active",
    securityClassification: "internal",
    comparison: "allowance",
  },
  {
    id: "ent_def_nonprod_max",
    productId: "prd_relyxus",
    key: "deployments.nonproduction.max",
    label: "Non-production deployments",
    dataType: "integer",
    validation: "0 to 20",
    defaultValue: "2",
    description: "Staging, test and training installations.",
    lifecycle: "active",
    securityClassification: "internal",
    comparison: "allowance",
  },
  {
    id: "ent_def_support_tier",
    productId: "prd_relyxus",
    key: "support.tier",
    label: "Support tier",
    dataType: "enum",
    validation: "One of the listed tiers",
    allowedValues: ["standard", "premium", "mission critical"],
    defaultValue: "standard",
    description: "Response targets and escalation path for support cases.",
    lifecycle: "active",
    securityClassification: "public",
    comparison: "exact",
  },
  {
    id: "ent_def_ai_routing",
    productId: "prd_relyxus",
    key: "modules.ai_routing",
    label: "AI routing module",
    dataType: "enum",
    validation: "Enabled or Not included",
    allowedValues: ["Enabled", "Not included"],
    defaultValue: "Not included",
    description: "Payment routing recommendations. Commercial add-on.",
    lifecycle: "active",
    securityClassification: "confidential",
    comparison: "exact",
  },
  {
    id: "ent_def_regulatory",
    productId: "prd_relyxus",
    key: "modules.regulatory_pack",
    label: "Regulatory reporting pack",
    dataType: "enum",
    validation: "Enabled or Not included",
    allowedValues: ["Enabled", "Not included"],
    defaultValue: "Not included",
    description: "Prebuilt regulator report templates. Commercial add-on.",
    lifecycle: "active",
    securityClassification: "confidential",
    comparison: "exact",
  },
  {
    id: "ent_def_legacy_export",
    productId: "prd_relyxus",
    key: "modules.legacy_export",
    label: "Legacy CSV export",
    dataType: "boolean",
    validation: "true or false",
    defaultValue: "false",
    description: "Replaced by audit export to object storage in 2.3. Not offered on new contracts.",
    lifecycle: "deprecated",
    securityClassification: "internal",
    comparison: "exact",
  },
  {
    id: "ent_def_s_seats",
    productId: "prd_sentinel",
    key: "seats.max",
    label: "Analyst seats",
    dataType: "integer",
    validation: "1 to 500",
    defaultValue: "10",
    description: "Named analysts who may use Sentinel.",
    lifecycle: "draft",
    securityClassification: "internal",
    comparison: "allowance",
  },
];

/**
 * Customer entitlement records. They follow the latest signed revision except where a
 * drift case is staged for the drift review screen.
 */
export const customerEntitlements: CustomerEntitlement[] = licenses.flatMap((license) => {
  const contract = contracts.find((c) => c.id === license.contractId);
  const latest = license.revisions.at(-1);
  if (!contract || !latest) return [];
  return latest.entitlements.map((e) => {
    const goodwill = license.customerId === "cus_tamsin" && e.key === "modules.regulatory_pack";
    return {
      id: `ce_${license.customerId.slice(4)}_${e.key.replace(/\W/g, "_")}`,
      customerId: license.customerId,
      productId: license.productId,
      key: e.key,
      value: goodwill ? "Enabled" : e.value,
      sourceContractId: contract.id,
      effectiveAt: contract.effectiveAt,
      expiresAt: contract.endsAt,
      overrideReason: goodwill
        ? "Commercial goodwill for the 2026 migration; license not yet reissued."
        : undefined,
      approvalId: goodwill ? "apr_1018" : undefined,
      history: [
        {
          at: contract.effectiveAt,
          value: e.value,
          byId: "stf_02",
          reason: "Created from contract",
        },
        ...(goodwill
          ? [
              {
                at: "2026-09-18T10:00:00Z",
                value: "Enabled",
                byId: "stf_02",
                reason: "Commercial goodwill override",
                approvalId: "apr_1018",
              },
            ]
          : []),
      ],
    };
  });
});

/**
 * License metadata deployments reported at check in. Atlas reports more non-production
 * environments than its license allows (the unregistered cluster behind apr_1043).
 */
export const observedEntitlements: ObservedEntitlement[] = licenses.flatMap((license) => {
  const bound = deployments.filter((d) => d.licenseId === license.id);
  const reporter = bound[0];
  if (!reporter) return [];
  const production = bound.filter((d) => d.environment !== "staging").length;
  const nonProduction = bound.filter((d) => d.environment === "staging").length;
  const observedAt = reporter.lastCheckInAt ?? license.validFrom;
  return [
    {
      customerId: license.customerId,
      productId: license.productId,
      key: "deployments.production.max",
      value: String(production),
      observedAt,
      deploymentId: reporter.id,
    },
    {
      customerId: license.customerId,
      productId: license.productId,
      key: "deployments.nonproduction.max",
      value: String(license.customerId === "cus_atlas" ? 5 : nonProduction),
      observedAt,
      deploymentId: reporter.id,
    },
  ];
});
