import type {
  Contract,
  CustomerEntitlement,
  EntitlementDefinition,
  License,
  ObservedEntitlement,
} from "./types";

/** The four sources the drift engine compares (spec §14). */
export interface EntitlementSources {
  contract?: string;
  entitlement?: string;
  license?: string;
  observed?: string;
}

export type DriftKind =
  "contract_vs_entitlement" | "entitlement_vs_license" | "observed_vs_license";

export const driftKindLabel: Record<DriftKind, string> = {
  contract_vs_entitlement: "Contract and entitlement differ",
  entitlement_vs_license: "Entitlement not yet signed",
  observed_vs_license: "Deployment exceeds signed license",
};

export interface DriftFinding {
  kind: DriftKind;
  /** One sentence naming both values. */
  detail: string;
}

const asNumber = (v: string | undefined) => (v === undefined ? NaN : Number(v));

/**
 * Compares contract, customer entitlement, signed license payload and observed deployment
 * metadata for one key (spec §14). Allowances may be under-used; everything else must match.
 */
export function compareSources(
  definition: Pick<EntitlementDefinition, "label" | "comparison">,
  sources: EntitlementSources,
): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const { contract, entitlement, license, observed } = sources;
  if (contract !== undefined && entitlement !== undefined && contract !== entitlement) {
    findings.push({
      kind: "contract_vs_entitlement",
      detail: `Contract says ${contract}; the entitlement record says ${entitlement}.`,
    });
  }
  if (entitlement !== undefined && license !== undefined && entitlement !== license) {
    findings.push({
      kind: "entitlement_vs_license",
      detail: `Entitlement is ${entitlement}; the signed license still says ${license}.`,
    });
  }
  if (observed !== undefined && license !== undefined) {
    const exceeds =
      definition.comparison === "allowance"
        ? asNumber(observed) > asNumber(license)
        : observed !== license;
    if (exceeds) {
      findings.push({
        kind: "observed_vs_license",
        detail:
          definition.comparison === "allowance"
            ? `Deployments report ${observed} ${definition.label.toLowerCase()}; the license allows ${license}.`
            : `Deployments report ${observed}; the license says ${license}.`,
      });
    }
  }
  return findings;
}

export interface EntitlementRow {
  definition: EntitlementDefinition;
  record?: CustomerEntitlement;
  sources: EntitlementSources;
  findings: DriftFinding[];
}

/** Every defined entitlement for one customer and product, with its four sources. */
export function entitlementRows(input: {
  customerId: string;
  productId: string;
  definitions: EntitlementDefinition[];
  contract?: Contract;
  license?: License;
  records: CustomerEntitlement[];
  observed: ObservedEntitlement[];
}): EntitlementRow[] {
  const signed = input.license?.revisions.at(-1)?.entitlements ?? [];
  return input.definitions
    .filter((d) => d.productId === input.productId && d.lifecycle !== "draft")
    .map((definition) => {
      const record = input.records.find(
        (r) =>
          r.customerId === input.customerId &&
          r.productId === input.productId &&
          r.key === definition.key,
      );
      const sources: EntitlementSources = {
        contract: input.contract?.scope[definition.key],
        entitlement: record?.value,
        license: signed.find((e) => e.key === definition.key)?.value,
        observed: input.observed.find(
          (o) =>
            o.customerId === input.customerId &&
            o.productId === input.productId &&
            o.key === definition.key,
        )?.value,
      };
      return { definition, record, sources, findings: compareSources(definition, sources) };
    })
    .filter((row) => Object.values(row.sources).some((v) => v !== undefined));
}

export interface DriftItem {
  customerId: string;
  productId: string;
  licenseId?: string;
  definition: EntitlementDefinition;
  sources: EntitlementSources;
  findings: DriftFinding[];
}

/** Drift review (spec §14): every customer, product and key where the sources disagree. */
export function driftReview(input: {
  definitions: EntitlementDefinition[];
  contracts: Contract[];
  licenses: License[];
  records: CustomerEntitlement[];
  observed: ObservedEntitlement[];
}): DriftItem[] {
  return input.licenses.flatMap((license) => {
    const contract = input.contracts.find((c) => c.id === license.contractId);
    return entitlementRows({
      customerId: license.customerId,
      productId: license.productId,
      definitions: input.definitions,
      contract,
      license,
      records: input.records,
      observed: input.observed,
    })
      .filter((row) => row.findings.length > 0)
      .map((row) => ({
        customerId: license.customerId,
        productId: license.productId,
        licenseId: license.id,
        definition: row.definition,
        sources: row.sources,
        findings: row.findings,
      }));
  });
}

/**
 * Diff preview for a proposed change (spec §14): current, proposed, source and whether
 * the signed license must be reissued.
 */
export function previewChange(row: EntitlementRow, proposed: string) {
  const changes = proposed !== row.sources.entitlement;
  return {
    current: row.sources.entitlement,
    proposed,
    source: row.record?.sourceContractId,
    requiresNewLicenseRevision: changes && proposed !== row.sources.license,
    belowObservedUsage:
      row.definition.comparison === "allowance" &&
      row.sources.observed !== undefined &&
      Number(proposed) < Number(row.sources.observed),
  };
}
