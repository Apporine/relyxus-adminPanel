import type {
  AuditEvent,
  Contract,
  Customer,
  Deployment,
  License,
  SuccessMilestone,
  SupportCase,
} from "./types";

export type TimelineCategory =
  "commercial" | "licensing" | "deployment" | "support" | "success" | "admin";

export interface TimelineEvent {
  id: string;
  at: string;
  category: TimelineCategory;
  title: string;
  detail?: string;
  href?: string;
  /** Actor staff ID when a person caused the event. */
  actorId?: string;
}

export const timelineCategoryLabel: Record<TimelineCategory, string> = {
  commercial: "Commercial",
  licensing: "Licensing",
  deployment: "Deployment",
  support: "Support",
  success: "Success",
  admin: "Admin",
};

/**
 * One customer history across commercial, licensing, deployment, support, success and
 * administrative events (spec §10.1), newest first. Future-dated items are excluded.
 */
export function buildTimeline(input: {
  customer: Customer;
  contracts: Contract[];
  licenses: License[];
  deployments: Deployment[];
  supportCases: SupportCase[];
  milestones: SuccessMilestone[];
  audit: AuditEvent[];
  now: string;
}): TimelineEvent[] {
  const base = `/customers/${input.customer.id}`;
  const events: TimelineEvent[] = [
    {
      id: `customer-${input.customer.id}`,
      at: input.customer.customerSince,
      category: "commercial",
      title: "Became an Apporine customer",
      href: base,
    },
    ...input.contracts.map((c) => ({
      id: `contract-${c.id}`,
      at: c.effectiveAt,
      category: "commercial" as const,
      title: `Contract ${c.number} effective`,
      detail: `${c.renewalType === "auto" ? "Auto" : "Manual"} renewal, ${c.noticeDays} day notice`,
      href: `${base}?tab=contracts`,
    })),
    ...input.licenses.flatMap((l) =>
      l.revisions.map((r) => ({
        id: `license-${l.id}-${r.revision}`,
        at: r.issuedAt,
        category: "licensing" as const,
        title: `${l.id} revision ${r.revision} issued`,
        detail: r.reason,
        href: `/licensing/${l.id}`,
        actorId: r.issuedById,
      })),
    ),
    ...input.deployments
      .filter((d) => d.lastCheckInAt)
      .map((d) => ({
        id: `checkin-${d.id}`,
        at: d.lastCheckInAt as string,
        category: "deployment" as const,
        title: `${d.logicalName} checked in`,
        detail: `Release ${d.releaseVersion} on ${d.platform}`,
        href: `/deployments/${d.id}`,
      })),
    ...input.supportCases.flatMap((c) => [
      {
        id: `case-open-${c.id}`,
        at: c.openedAt,
        category: "support" as const,
        title: `${c.externalRef} opened, ${c.severity.toUpperCase()}`,
        detail: c.title,
        href: `${base}?tab=support`,
      },
      ...(c.resolvedAt
        ? [
            {
              id: `case-resolved-${c.id}`,
              at: c.resolvedAt,
              category: "support" as const,
              title: `${c.externalRef} resolved`,
              detail: c.title,
              href: `${base}?tab=support`,
            },
          ]
        : []),
    ]),
    ...input.milestones
      .filter((m) => m.status === "done")
      .map((m) => ({
        id: `milestone-${m.title}`,
        at: m.dueAt,
        category: "success" as const,
        title: `Milestone completed: ${m.title}`,
        href: `${base}?tab=success`,
        actorId: m.ownerId,
      })),
    ...input.audit.map((e) => ({
      id: `audit-${e.id}`,
      at: e.at,
      category: "admin" as const,
      title: e.actionLabel,
      detail: e.reason,
      href: `${base}?tab=audit`,
      actorId: e.actorId,
    })),
  ];
  return events.filter((e) => e.at <= input.now).sort((a, b) => b.at.localeCompare(a.at));
}
