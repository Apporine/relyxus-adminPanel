import { daysUntil } from "@/lib/format";
import type {
  Contact,
  Contract,
  Customer,
  Deployment,
  License,
  Release,
  SupportCase,
} from "./types";

/**
 * Explainable customer health (spec §19). The score is advisory: it shows every factor,
 * the signal behind it and links to the source records. Factor weights are not yet
 * defined by the specification, so the weights below are illustrative and labelled so.
 */

export type FactorKey =
  "commercial" | "licensing" | "deployment" | "support" | "adoption" | "relationship" | "security";

export type FactorStatus = "ok" | "attention" | "risk" | "not_measured";

export interface SourceLink {
  label: string;
  href: string;
}

export interface HealthFactor {
  key: FactorKey;
  label: string;
  status: FactorStatus;
  /** Plain-language signals that produced the status. */
  signals: string[];
  sources: SourceLink[];
  /** Points deducted from 100. */
  impact: number;
}

export const ILLUSTRATIVE_WEIGHTS: Record<Exclude<FactorStatus, "ok" | "not_measured">, number> = {
  attention: 8,
  risk: 20,
};

export const HEALTH_MODEL_VERSION = "design-0.1";

function factor(
  key: FactorKey,
  label: string,
  risks: string[],
  attentions: string[],
  sources: SourceLink[],
  okSignal: string,
): HealthFactor {
  const status: FactorStatus = risks.length ? "risk" : attentions.length ? "attention" : "ok";
  return {
    key,
    label,
    status,
    signals: status === "ok" ? [okSignal] : [...risks, ...attentions],
    sources,
    impact: status === "ok" ? 0 : ILLUSTRATIVE_WEIGHTS[status],
  };
}

export interface HealthInput {
  customer: Customer;
  contracts: Contract[];
  licenses: License[];
  deployments: Deployment[];
  releases: Release[];
  contacts: Contact[];
  supportCases: SupportCase[];
  now: string;
}

export function computeHealthFactors(input: HealthInput): HealthFactor[] {
  const { customer, now } = input;
  const base = `/customers/${customer.id}`;

  // Commercial
  const commercialRisk: string[] = [];
  const commercialAttention: string[] = [];
  for (const contract of input.contracts) {
    const days = daysUntil(contract.endsAt, now);
    const noticeDays = days - contract.noticeDays;
    if (days >= 0 && days <= 90) {
      const msg = `Contract ${contract.number} ends in ${days} days (renewal ${contract.renewalStage.replaceAll("_", " ")})`;
      if (
        noticeDays <= 7 &&
        contract.renewalStage !== "committed" &&
        contract.renewalStage !== "renewed"
      ) {
        commercialRisk.push(
          `${msg}; notice deadline ${noticeDays < 0 ? "has passed" : `in ${noticeDays} days`}`,
        );
      } else commercialAttention.push(msg);
    }
  }

  // Licensing
  const licensingRisk = input.licenses
    .filter((l) =>
      ["grace", "expired", "suspended", "revoked", "verification_failed"].includes(l.state),
    )
    .map((l) => `${l.id} is ${l.state.replaceAll("_", " ")}`);
  const licensingAttention = input.licenses
    .filter((l) => l.state === "active" && daysUntil(l.expiresAt, now) <= 60)
    .map((l) => `${l.id} expires in ${daysUntil(l.expiresAt, now)} days`);

  // Deployment
  const releaseStatus = new Map(
    input.releases.map((r) => [`${r.productId}:${r.version}`, r.status]),
  );
  const deploymentRisk: string[] = [];
  const deploymentAttention: string[] = [];
  for (const d of input.deployments) {
    const status = releaseStatus.get(`${d.productId}:${d.releaseVersion}`);
    if (d.supportState === "unsupported" || status === "end_of_support") {
      deploymentRisk.push(`${d.logicalName} runs unsupported release ${d.releaseVersion}`);
    } else if (d.supportState === "license_mismatch") {
      deploymentRisk.push(`${d.logicalName} license does not match entitlement`);
    } else if (d.supportState === "stale_check_in") {
      deploymentAttention.push(
        `${d.logicalName} has not checked in since ${d.lastCheckInAt?.slice(0, 10) ?? "unknown"}`,
      );
    } else if (d.supportState === "review_needed" || status === "deprecated") {
      deploymentAttention.push(
        `${d.logicalName} on ${status === "deprecated" ? "deprecated" : "review-needed"} release ${d.releaseVersion}`,
      );
    }
  }

  // Support
  const open = input.supportCases.filter((c) => c.status !== "resolved");
  const supportRisk = [
    ...open.filter((c) => c.severity === "sev1").map((c) => `${c.externalRef} severity 1 open`),
    ...input.supportCases
      .filter((c) => c.slaState === "breached")
      .map((c) => `${c.externalRef} breached SLA`),
  ];
  const supportAttention = [
    ...open.filter((c) => c.severity === "sev2").map((c) => `${c.externalRef} severity 2 open`),
    ...open.filter((c) => c.slaState === "at_risk").map((c) => `${c.externalRef} SLA at risk`),
  ];

  // Relationship
  const active = input.contacts.filter((c) => c.active);
  const hasRole = (role: Contact["roles"][number]) => active.some((c) => c.roles.includes(role));
  const relationshipRisk = hasRole("executive") ? [] : ["No active executive contact"];
  const relationshipAttention = [
    ...(hasRole("security") ? [] : ["No active security contact"]),
    ...(hasRole("technical") ? [] : ["No active technical contact"]),
    ...(customer.owners.customer_success_owner ? [] : ["No Apporine customer success owner"]),
    ...input.contacts.filter((c) => !c.active).map((c) => `${c.name} is inactive`),
  ];

  return [
    factor(
      "commercial",
      "Commercial",
      commercialRisk,
      commercialAttention,
      [{ label: "Contracts", href: `${base}?tab=contracts` }],
      "No renewal due within 90 days",
    ),
    factor(
      "licensing",
      "Licensing",
      licensingRisk,
      licensingAttention,
      [{ label: "Licenses", href: `${base}?tab=licenses` }],
      "All licenses active and valid beyond 60 days",
    ),
    factor(
      "deployment",
      "Deployment",
      deploymentRisk,
      deploymentAttention,
      [{ label: "Deployments", href: `${base}?tab=deployments` }],
      "All deployments supported and checking in",
    ),
    factor(
      "support",
      "Support",
      supportRisk,
      supportAttention,
      [{ label: "Support cases", href: `${base}?tab=support` }],
      "No high-severity cases or SLA breaches",
    ),
    {
      key: "adoption",
      label: "Adoption",
      status: "not_measured",
      signals: ["Customer has not authorised sharing adoption metadata"],
      sources: [{ label: "Usage", href: `${base}?tab=usage` }],
      impact: 0,
    },
    factor(
      "relationship",
      "Relationship",
      relationshipRisk,
      relationshipAttention,
      [{ label: "Contacts", href: `${base}?tab=contacts` }],
      "Executive, security and technical contacts in place",
    ),
    factor(
      "security",
      "Security",
      [],
      [],
      [{ label: "Audit", href: `${base}?tab=audit` }],
      "No open security exceptions",
    ),
  ];
}

export function healthScore(factors: HealthFactor[]): number {
  return Math.max(0, 100 - factors.reduce((sum, f) => sum + f.impact, 0));
}
