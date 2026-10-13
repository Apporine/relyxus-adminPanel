import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/description-list";
import type { OwnerRole } from "@/domain/types";
import { priority as priorityPresentation } from "@/domain/status";
import { formatDate, formatRelativeDays, formatRelativeTime } from "@/lib/format";
import type { Customer360 } from "./load";

const ownerRoleLabel: Record<OwnerRole, string> = {
  executive_sponsor: "Executive sponsor",
  commercial_owner: "Commercial owner",
  customer_success_owner: "Customer success owner",
  technical_owner: "Technical owner",
  support_owner: "Support owner",
  security_owner: "Security owner",
};

const segmentLabel = {
  enterprise: "Enterprise",
  mid_market: "Mid market",
  public_sector: "Public sector",
};

/** Left column: identity, Apporine account team, references and account relationships. */
export function IdentityRail({ data }: { data: Customer360 }) {
  const { customer, staff } = data;
  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="c360-identity">
        <CardHeader>
          <CardTitle id="c360-identity">Identity</CardTitle>
        </CardHeader>
        <CardContent>
          <DescriptionList
            items={[
              { term: "Legal name", value: customer.legalName },
              { term: "Account type", value: segmentLabel[customer.segment] },
              { term: "Industry", value: customer.industry },
              { term: "Headquarters", value: customer.headquartersCountry },
              { term: "Data residency", value: customer.dataResidency },
              {
                term: "Deployment model",
                value:
                  customer.deploymentModel === "customer_hosted"
                    ? "Customer hosted"
                    : "Apporine managed",
              },
              { term: "Customer since", value: formatDate(customer.customerSince) },
              {
                term: "Go live",
                value: customer.goLiveAt ? formatDate(customer.goLiveAt) : undefined,
              },
              {
                term: "Website",
                value: (
                  <a
                    href={customer.website}
                    className="text-violet-text hover:underline"
                    rel="noreferrer"
                    target="_blank"
                  >
                    {customer.website.replace("https://", "")}
                  </a>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card aria-labelledby="c360-team">
        <CardHeader>
          <CardTitle id="c360-team">Account team</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2.5">
            {(Object.keys(ownerRoleLabel) as OwnerRole[]).map((role) => {
              const owner = customer.owners[role] ? staff[customer.owners[role]] : undefined;
              return (
                <li key={role} className="flex flex-col">
                  <span className="text-micro text-fg-muted">{ownerRoleLabel[role]}</span>
                  {owner ? (
                    <span className="text-dense text-fg">{owner.name}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-dense font-medium text-coral-text">
                      <AlertTriangle aria-hidden="true" className="size-3.5" />
                      Not assigned
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card aria-labelledby="c360-refs">
        <CardHeader>
          <CardTitle id="c360-refs">References</CardTitle>
        </CardHeader>
        <CardContent>
          <DescriptionList
            items={[
              {
                term: "CRM ID",
                value: customer.references.crmId && (
                  <code className="font-mono text-micro">{customer.references.crmId}</code>
                ),
              },
              {
                term: "Finance system ID",
                value: customer.references.financeId && (
                  <code className="font-mono text-micro">{customer.references.financeId}</code>
                ),
              },
              {
                term: "Support system ID",
                value: customer.references.supportId && (
                  <code className="font-mono text-micro">{customer.references.supportId}</code>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      {data.parent || data.subsidiaries.length ? (
        <Card aria-labelledby="c360-relationships">
          <CardHeader>
            <CardTitle id="c360-relationships">Account relationships</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-dense">
              {data.parent ? (
                <li>
                  <span className="text-micro text-fg-muted">Parent account</span>
                  <Link
                    href={`/customers/${data.parent.id}`}
                    className="block text-violet-text hover:underline"
                  >
                    {data.parent.displayName}
                  </Link>
                </li>
              ) : null}
              {data.subsidiaries.map((s) => (
                <li key={s.id}>
                  <span className="text-micro text-fg-muted">Subsidiary</span>
                  <Link
                    href={`/customers/${s.id}`}
                    className="block text-violet-text hover:underline"
                  >
                    {s.displayName}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/** Right rail: next actions, open risks and recent administrative activity. */
export function ActionRail({ data }: { data: Customer360 }) {
  const { now, staff } = data;
  const risks = data.factors.filter((f) => f.status === "risk" || f.status === "attention");
  const upcoming = data.milestones.filter((m) => m.status !== "done");
  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="c360-next">
        <CardHeader>
          <CardTitle id="c360-next">Next actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {data.tasks.length === 0 && upcoming.length === 0 ? (
            <p className="text-dense text-fg-muted">No open tasks or milestones.</p>
          ) : null}
          {data.tasks.map((task) => (
            <Link
              key={task.id}
              href={task.href}
              className="flex flex-col gap-1 rounded-control hover:bg-surface-hover"
            >
              <StatusBadge
                tone={priorityPresentation[task.priority].tone}
                label={priorityPresentation[task.priority].label}
                className="self-start"
              />
              <span className="text-dense text-fg">{task.title}</span>
              <span className="text-micro text-fg-muted">
                {staff[task.ownerId]?.name} · due {formatRelativeDays(task.dueAt, now)}
              </span>
            </Link>
          ))}
          {upcoming.map((m) => (
            <div
              key={m.title}
              className="flex flex-col gap-0.5 border-t border-border pt-3 first:border-t-0 first:pt-0"
            >
              <span className="text-micro text-fg-muted">Success milestone</span>
              <span className="text-dense text-fg">{m.title}</span>
              <span
                className={
                  m.status === "overdue"
                    ? "text-micro font-medium text-coral-text"
                    : "text-micro text-fg-muted"
                }
              >
                {staff[m.ownerId]?.name} · {m.status === "overdue" ? "overdue, was due" : "due"}{" "}
                {formatRelativeDays(m.dueAt, now)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card aria-labelledby="c360-risks">
        <CardHeader>
          <CardTitle id="c360-risks">Risks</CardTitle>
        </CardHeader>
        <CardContent>
          {risks.length === 0 ? (
            <p className="text-dense text-fg-muted">No open risk signals.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {risks.map((f) => (
                <li key={f.key} className="flex flex-col gap-1">
                  <StatusBadge
                    tone={f.status === "risk" ? "risk" : "neutral"}
                    label={`${f.label}: ${f.status === "risk" ? "risk" : "attention"}`}
                    className="self-start"
                  />
                  <span className="text-dense text-fg-secondary">{f.signals[0]}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card aria-labelledby="c360-recent-audit">
        <CardHeader>
          <CardTitle id="c360-recent-audit">Recent audit</CardTitle>
        </CardHeader>
        <CardContent>
          {data.audit.length === 0 ? (
            <p className="text-dense text-fg-muted">No administrative events for this customer.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {data.audit.slice(0, 4).map((e) => (
                <li key={e.id} className="flex flex-col">
                  <span className="text-dense text-fg">{e.actionLabel}</span>
                  <span className="text-micro text-fg-muted">
                    {staff[e.actorId]?.name} ·{" "}
                    <time dateTime={e.at}>{formatRelativeTime(e.at, now)}</time>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/customers/${data.customer.id}?tab=audit`}
            className="mt-3 inline-flex items-center gap-1 text-dense font-medium text-violet-text hover:underline"
          >
            Customer audit <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
