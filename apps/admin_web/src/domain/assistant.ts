import { toGbp } from "./finance";
import { healthStatus, licenseState, supportState } from "./status";
import type {
  ApprovalRequest,
  AuditEvent,
  Contract,
  Customer,
  Deployment,
  FxRates,
  Iso,
  License,
  Release,
  RiskEntry,
  SupportCase,
} from "./types";

/**
 * Apporine operator assistant (spec §29), read only. Briefs are assembled from records;
 * every line links to the record it came from, so nothing is invented and nothing is
 * changed. A future model-backed version must keep the same contract.
 */

export interface BriefLine {
  text: string;
  href: string;
}

export interface Brief {
  title: string;
  lines: BriefLine[];
}

const DAY = 86_400_000;
const gbp = (minor: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(minor / 100);
const date = (iso: Iso) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(iso),
  );
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export interface AssistantContext {
  now: Iso;
  fx: FxRates;
  canViewCommercial: boolean;
  customers: Customer[];
  contracts: Contract[];
  licenses: License[];
  deployments: Deployment[];
  releases: Release[];
  approvals: ApprovalRequest[];
  cases: SupportCase[];
  risks: RiskEntry[];
}

/** Portfolio brief for the current user's scope. */
export function portfolioBrief(ctx: AssistantContext): Brief {
  const soon = ctx.contracts.filter((c) => {
    const days = (Date.parse(c.endsAt) - Date.parse(ctx.now)) / DAY;
    return (c.status === "active" || c.status === "renewing") && days >= 0 && days <= 90;
  });
  const atRisk = ctx.customers.filter((c) => c.health === "at_risk" || c.health === "critical");
  const grace = ctx.licenses.filter((l) => l.state === "grace");
  const pending = ctx.approvals.filter((a) => a.state === "pending");
  const unsupported = ctx.deployments.filter(
    (d) => d.supportState === "unsupported" && d.environment === "production",
  );
  const value = soon.reduce((s, c) => s + toGbp(c.annualContractValue, ctx.fx), 0);

  return {
    title: "Portfolio brief",
    lines: [
      {
        text: `${count(soon.length, "contract")} renew in the next 90 days${
          ctx.canViewCommercial ? `, worth ${gbp(value)} a year` : ""
        }.`,
        href: "/commercial/renewals",
      },
      {
        text: atRisk.length
          ? `${count(atRisk.length, "customer")} at risk or critical: ${atRisk.map((c) => c.displayName).join(", ")}.`
          : "No customers are at risk or critical.",
        href: "/success",
      },
      {
        text: `${count(grace.length, "license")} in grace period.`,
        href: "/licensing?state=grace",
      },
      {
        text: `${count(pending.length, "approval")} pending, ${pending.filter((a) => a.highImpact).length} high impact.`,
        href: "/approvals?view=team",
      },
      {
        text: `${count(unsupported.length, "production deployment")} on an unsupported release.`,
        href: "/deployments?environment=production&support=unsupported",
      },
    ],
  };
}

/** Customer brief from Customer 360 records; commercial value only with permission. */
export function customerBrief(customer: Customer, ctx: AssistantContext): Brief {
  const base = `/customers/${customer.id}`;
  const licenses = ctx.licenses.filter((l) => l.customerId === customer.id);
  const deployments = ctx.deployments.filter((d) => d.customerId === customer.id);
  const notSupported = deployments.filter((d) => d.supportState !== "supported");
  const cases = ctx.cases.filter((c) => c.customerId === customer.id && c.status !== "resolved");
  const risks = ctx.risks.filter(
    (r) => r.customerId === customer.id && r.status !== "closed" && r.status !== "accepted",
  );
  const lines: BriefLine[] = [
    {
      text: `Health is ${healthStatus[customer.health].label.toLowerCase()}; lifecycle stage ${customer.lifecycleStage.replaceAll("_", " ")}.`,
      href: `/success/health/${customer.id}`,
    },
  ];
  if (customer.nextRenewalAt) {
    lines.push({
      text: `Next renewal ${date(customer.nextRenewalAt)}${
        ctx.canViewCommercial && customer.annualContractValue
          ? `, annual value ${new Intl.NumberFormat("en-GB", { style: "currency", currency: customer.annualContractValue.currency, notation: "compact" }).format(customer.annualContractValue.amountMinor / 100)}`
          : ""
      }.`,
      href: `${base}?tab=contracts`,
    });
  }
  lines.push({
    text: licenses.length
      ? `Licenses: ${licenses.map((l) => `${l.id} ${licenseState[l.state].label.toLowerCase()}`).join(", ")}.`
      : "No licenses yet.",
    href: `${base}?tab=licenses`,
  });
  lines.push({
    text: `${count(deployments.length, "deployment")}${
      notSupported.length
        ? `; ${notSupported.map((d) => `${d.logicalName} ${supportState[d.supportState].label.toLowerCase()}`).join(", ")}`
        : ", all supported"
    }.`,
    href: `${base}?tab=deployments`,
  });
  lines.push({
    text: `${count(cases.length, "open support case")}${
      cases.some((c) => c.escalation) ? ", including an escalation" : ""
    }.`,
    href: `${base}?tab=support`,
  });
  lines.push({
    text: risks.length
      ? `${count(risks.length, "open risk")}: ${risks.map((r) => r.title).join("; ")}.`
      : "No open risks.",
    href: "/success/risks",
  });
  return { title: `${customer.displayName} brief`, lines };
}

/** Which customers and deployments a release's end of support affects. */
export function releaseImpactBrief(release: Release, ctx: AssistantContext): Brief {
  const on = ctx.deployments.filter(
    (d) => d.productId === release.productId && d.releaseVersion === release.version,
  );
  const customers = [...new Set(on.map((d) => d.customerId))].map(
    (id) => ctx.customers.find((c) => c.id === id)?.displayName ?? id,
  );
  const ended = release.endOfSupportAt && Date.parse(release.endOfSupportAt) <= Date.parse(ctx.now);
  return {
    title: `Release ${release.version} impact`,
    lines: [
      {
        text: release.endOfSupportAt
          ? `${ended ? "Support ended" : "Support ends"} ${date(release.endOfSupportAt)}.`
          : "No end of support date is set.",
        href: `/releases/${release.id}`,
      },
      {
        text: on.length
          ? `${count(on.length, "deployment")} at ${count(customers.length, "customer")} run it: ${customers.join(", ")}.`
          : "No deployments run this release.",
        href: `/deployments/readiness`,
      },
      {
        text: "Upgrades are planned per deployment and need the customer's change approval; nothing is scheduled automatically.",
        href: `/releases/${release.id}`,
      },
    ],
  };
}

/** Plain-language account of one correlated action, oldest first, linking every event. */
export function auditTrailBrief(
  events: AuditEvent[],
  correlationId: string,
  actorName: (id: string) => string,
): Brief {
  const chain = events
    .filter((e) => e.correlationId === correlationId)
    .sort((a, b) => a.at.localeCompare(b.at));
  return {
    title: "Audit explanation",
    lines: chain.map((e) => ({
      text: `${e.at.slice(11, 16)} UTC: ${actorName(e.actorId)}${
        e.effectiveIdentity ? ` (as ${e.effectiveIdentity})` : ""
      } — ${e.actionLabel.toLowerCase()}${e.result === "success" ? "" : `, ${e.result}`}.`,
      href: `/audit?event=${e.id}`,
    })),
  };
}

// Natural language search ----------------------------------------------------------------

export interface Interpretation {
  href: string;
  explanation: string;
}

const rules: { test: RegExp; href: string; explanation: string }[] = [
  { test: /\bgrace\b/, href: "/licensing?state=grace", explanation: "Licenses in grace period" },
  {
    test: /expir/,
    href: "/licensing?expiring=30",
    explanation: "Licenses expiring within 30 days",
  },
  {
    test: /(unsupported|end of support)/,
    href: "/deployments?support=unsupported",
    explanation: "Deployments on an unsupported release",
  },
  {
    test: /(denied|denial)/,
    href: "/audit?result=denied",
    explanation: "Audit events with a denied result",
  },
  {
    test: /(high impact|revok|break glass)/,
    href: "/audit?impact=high",
    explanation: "High impact audit events",
  },
  { test: /renew/, href: "/commercial/renewals", explanation: "Renewal radar" },
  { test: /approv/, href: "/approvals?view=team", explanation: "Team approval queue" },
  {
    test: /(at risk|critical|health)/,
    href: "/success",
    explanation: "Customer health overview",
  },
  {
    test: /(cost|margin)/,
    href: "/analytics/finance/cost-to-serve",
    explanation: "Cost to serve",
  },
  {
    test: /(duplicate|missing owner|data quality)/,
    href: "/analytics/data-quality",
    explanation: "Data quality center",
  },
];

/**
 * Turns a question into a permission-aware filter link. Pages apply the filters on the
 * server with the viewer's permissions, so a question can never widen access.
 */
export function interpretQuestion(
  question: string,
  customers: { id: string; name: string }[],
): Interpretation | undefined {
  const q = question.toLowerCase();
  // Longest name first, so "Northwind Payments UK" is not read as "Northwind Payments".
  const customer = [...customers]
    .sort((a, b) => b.name.length - a.name.length)
    .find((c) => q.includes(c.name.toLowerCase()));
  if (customer) {
    return { href: `/customers/${customer.id}`, explanation: `Customer 360 for ${customer.name}` };
  }
  const rule = rules.find((r) => r.test.test(q));
  return rule ? { href: rule.href, explanation: rule.explanation } : undefined;
}

/** Renewal brief: value, health, support burden, open risks and pending entitlement changes. */
export function renewalBrief(contract: Contract, ctx: AssistantContext): Brief {
  const customer = ctx.customers.find((c) => c.id === contract.customerId);
  const cases = ctx.cases.filter((c) => c.customerId === contract.customerId);
  const open = cases.filter((c) => c.status !== "resolved");
  const risks = ctx.risks.filter(
    (r) => r.customerId === contract.customerId && r.status !== "closed" && r.status !== "accepted",
  );
  const changes = ctx.approvals.filter(
    (a) =>
      a.customerId === contract.customerId &&
      a.state === "pending" &&
      (a.type === "entitlement_change" || a.type.startsWith("license_")),
  );
  return {
    title: `${customer?.displayName ?? contract.customerId} renewal brief`,
    lines: [
      {
        text: `Contract ${contract.number} ends ${date(contract.endsAt)}; renewal stage ${contract.renewalStage.replaceAll("_", " ")}${
          ctx.canViewCommercial
            ? `, ${gbp(toGbp(contract.annualContractValue, ctx.fx))} a year`
            : ""
        }.`,
        href: `/commercial/renewals/${contract.id}`,
      },
      {
        text: customer
          ? `Health is ${healthStatus[customer.health].label.toLowerCase()}.`
          : "Customer record not found.",
        href: `/success/health/${contract.customerId}`,
      },
      {
        text: `Support burden: ${count(cases.length, "case")} on record, ${open.length} open${
          open.some((c) => c.escalation) ? ", one escalated" : ""
        }.`,
        href: `/customers/${contract.customerId}?tab=support`,
      },
      {
        text: risks.length
          ? `${count(risks.length, "open risk")}: ${risks.map((r) => r.title).join("; ")}.`
          : "No open risks.",
        href: "/success/risks",
      },
      {
        text: changes.length
          ? `${count(changes.length, "pending change")}: ${changes.map((a) => a.title).join("; ")}.`
          : "No pending entitlement or license changes.",
        href: "/approvals?view=all",
      },
    ],
  };
}
