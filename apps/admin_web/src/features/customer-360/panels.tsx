import {
  Check,
  CircleCheck,
  CircleDashed,
  Lock,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { BarList } from "@/components/charts/simple-charts";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableId } from "@/components/ui/copyable-id";
import { DescriptionList } from "@/components/ui/description-list";
import { EmptyState, Notice } from "@/components/ui/feedback";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { HEALTH_MODEL_VERSION, type FactorStatus } from "@/domain/health";
import { lifecycleStages } from "@/domain/portfolio";
import {
  contractStatus,
  deploymentEnvironment,
  healthStatus,
  licenseState,
  lifecycleStage,
  productStatus,
  renewalStage,
  supportState,
} from "@/domain/status";
import { timelineCategoryLabel, type TimelineEvent } from "@/domain/timeline";
import type { ContactRole, SupportCase } from "@/domain/types";
import { cn } from "@/lib/cn";
import {
  daysUntil,
  formatDate,
  formatMoney,
  formatRelativeDays,
  formatRelativeTime,
  formatTimestamp,
  plural,
} from "@/lib/format";
import type { Customer360 } from "./load";
import type { CustomerTabId } from "./tabs";

type PanelProps = { data: Customer360 };

const factorPresentation: Record<
  FactorStatus,
  { icon: LucideIcon; label: string; className: string }
> = {
  ok: { icon: CircleCheck, label: "OK", className: "text-cyan-text" },
  attention: { icon: TriangleAlert, label: "Attention", className: "text-fg-secondary" },
  risk: { icon: OctagonAlert, label: "Risk", className: "text-coral-text" },
  not_measured: { icon: CircleDashed, label: "Not measured", className: "text-fg-muted" },
};

const roleLabel: Record<ContactRole, string> = {
  executive: "Executive",
  commercial: "Commercial",
  technical: "Technical",
  security: "Security",
  support: "Support",
  billing: "Billing",
};

const severityLabel: Record<SupportCase["severity"], string> = {
  sev1: "Sev 1",
  sev2: "Sev 2",
  sev3: "Sev 3",
  sev4: "Sev 4",
};

function PanelCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card aria-labelledby={id}>
      <CardHeader>
        <div>
          <CardTitle id={id}>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
      </CardHeader>
      {children}
    </Card>
  );
}

// Overview ------------------------------------------------------------------------------------

function LifecycleProgress({ data }: PanelProps) {
  const current = lifecycleStages.indexOf(data.customer.lifecycleStage);
  return (
    <ol aria-label="Lifecycle progress" className="grid grid-cols-3 gap-x-3 gap-y-3">
      {lifecycleStages.map((stage, index) => {
        const done = index < current;
        const isCurrent = index === current;
        return (
          <li
            key={stage}
            aria-current={isCurrent ? "step" : undefined}
            className="flex flex-col gap-1.5"
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 rounded-full",
                done ? "bg-violet" : isCurrent ? "bg-violet-text" : "bg-surface-sunken",
              )}
            />
            <span
              className={cn(
                "flex items-center gap-1 text-micro",
                isCurrent ? "font-semibold text-fg" : "text-fg-muted",
              )}
            >
              {done ? <Check aria-hidden="true" className="size-3" /> : null}
              {lifecycleStage[stage]}
              {done ? <span className="sr-only">(complete)</span> : null}
              {isCurrent ? <span className="sr-only">(current)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function TimelineList({
  events,
  staff,
  now,
}: {
  events: TimelineEvent[];
  staff: Customer360["staff"];
  now: string;
}) {
  return (
    <ol className="flex flex-col">
      {events.map((event) => (
        <li
          key={event.id}
          className="grid grid-cols-[7rem_1fr] gap-3 border-t border-border py-2.5 first:border-t-0"
        >
          <span className="flex flex-col">
            <time dateTime={event.at} className="text-micro text-fg-secondary">
              {formatDate(event.at)}
            </time>
            <span className="text-micro text-fg-muted">{formatRelativeTime(event.at, now)}</span>
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <Tag>{timelineCategoryLabel[event.category]}</Tag>
              {event.href ? (
                <Link
                  href={event.href}
                  className="text-dense font-medium text-fg hover:text-violet-text hover:underline"
                >
                  {event.title}
                </Link>
              ) : (
                <span className="text-dense font-medium text-fg">{event.title}</span>
              )}
            </span>
            {event.detail || event.actorId ? (
              <span className="text-micro text-fg-muted">
                {[event.detail, event.actorId ? staff[event.actorId]?.name : undefined]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

function OverviewPanel({ data }: PanelProps) {
  const { customer } = data;
  return (
    <div className="flex flex-col gap-4">
      <PanelCard
        id="c360-lifecycle"
        title="Lifecycle"
        description={`Current stage: ${lifecycleStage[customer.lifecycleStage]}`}
      >
        <CardContent>
          <LifecycleProgress data={data} />
        </CardContent>
      </PanelCard>

      <PanelCard
        id="c360-health"
        title={`Health score ${data.score} / 100`}
        description={`Operator status: ${healthStatus[customer.health].label}. The score is advisory and shows every factor behind it.`}
      >
        <CardContent className="flex flex-col gap-3">
          <ul className="flex flex-col">
            {data.factors.map((factor) => {
              const p = factorPresentation[factor.status];
              return (
                <li
                  key={factor.key}
                  className="grid gap-2 border-t border-border py-2.5 first:border-t-0 sm:grid-cols-[9rem_1fr_auto]"
                >
                  <span className="flex items-center gap-2 text-dense font-medium text-fg">
                    <p.icon aria-hidden="true" className={cn("size-4", p.className)} />
                    {factor.label}
                    <span className="sr-only">: {p.label}</span>
                  </span>
                  <span className="flex flex-col gap-0.5 text-dense text-fg-secondary">
                    {factor.signals.map((signal) => (
                      <span key={signal}>{signal}</span>
                    ))}
                  </span>
                  <span className="flex items-start gap-3 text-micro sm:justify-end">
                    <span className="text-fg-muted tabular">
                      {factor.impact ? `−${factor.impact}` : "0"}
                    </span>
                    {factor.sources.map((s) => (
                      <Link
                        key={s.href}
                        href={s.href}
                        className="font-medium text-violet-text hover:underline"
                      >
                        {s.label}
                      </Link>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-micro text-fg-muted">
            Model {HEALTH_MODEL_VERSION}. Factor weights are illustrative until the specification
            defines them; an operator override keeps the calculated value visible.
          </p>
        </CardContent>
      </PanelCard>

      <PanelCard id="c360-recent" title="Recent activity">
        <CardContent>
          <TimelineList events={data.timeline.slice(0, 6)} staff={data.staff} now={data.now} />
          <Link
            href={`/customers/${customer.id}?tab=timeline`}
            className="mt-2 inline-block text-dense font-medium text-violet-text hover:underline"
          >
            Open full timeline
          </Link>
        </CardContent>
      </PanelCard>

      <Notice title="Customer data boundary">
        This workspace holds relationship metadata, approved technical metadata and references to
        source systems. It never stores customer production incidents, logs, traces, secrets or
        credentials.
      </Notice>
    </div>
  );
}

// Records ---------------------------------------------------------------------------------------

function ContactsPanel({ data }: PanelProps) {
  const active = data.contacts.filter((c) => c.active);
  const missing = (["executive", "security", "technical"] as const).filter(
    (role) => !active.some((c) => c.roles.includes(role)),
  );
  return (
    <div className="flex flex-col gap-4">
      {missing.length ? (
        <Notice
          tone="risk"
          title={`Missing ${missing.map((r) => roleLabel[r].toLowerCase()).join(", ")} contact`}
        >
          Relationship risk rises until an active contact covers each responsibility.
        </Notice>
      ) : null}
      <PanelCard
        id="c360-contacts"
        title="Contacts"
        description={plural(data.contacts.length, "contact")}
      >
        {data.contacts.length === 0 ? (
          <EmptyState
            title="No contacts recorded"
            body="Add the customer's executive, technical and security contacts."
          />
        ) : (
          <Table label="Contacts">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Responsibility</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Preferred channel</TableHeaderCell>
                <TableHeaderCell>Timezone</TableHeaderCell>
                <TableHeaderCell>State</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/customers/${data.customer.id}/contacts/${c.id}`}
                      className="font-medium text-fg hover:text-violet-text hover:underline"
                    >
                      {c.name}
                    </Link>
                    <span className="block text-micro text-fg-muted">{c.title}</span>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      {c.roles.map((r) => (
                        <Tag key={r}>{roleLabel[r]}</Tag>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell className="capitalize">{c.preferredChannel}</TableCell>
                  <TableCell>{c.timezone}</TableCell>
                  <TableCell>
                    {c.active ? (
                      <StatusBadge
                        tone={c.verified ? "healthy" : "neutral"}
                        label={c.verified ? "Verified" : "Unverified"}
                      />
                    ) : (
                      <StatusBadge tone="risk" label="Inactive" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PanelCard>
    </div>
  );
}

function ProductsPanel({ data }: PanelProps) {
  return (
    <PanelCard
      id="c360-products"
      title="Products"
      description="Products owned, with commercial and technical scope"
    >
      <Table label="Products">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Product status</TableHeaderCell>
            <TableHeaderCell>Contract</TableHeaderCell>
            <TableHeaderCell>Licenses</TableHeaderCell>
            <TableHeaderCell>Deployments</TableHeaderCell>
            <TableHeaderCell>Release train</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.products.map((p) => {
            const contract = data.contracts.find((c) => c.productIds.includes(p.id));
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-fg">
                  {p.name} <Tag className="ms-1">{p.code}</Tag>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    tone={productStatus[p.status].tone}
                    label={productStatus[p.status].label}
                  />
                </TableCell>
                <TableCell>
                  {contract ? contract.number : <span className="text-fg-muted">No contract</span>}
                </TableCell>
                <TableCell className="tabular">
                  {data.licenses.filter((l) => l.productId === p.id).length}
                </TableCell>
                <TableCell className="tabular">
                  {data.deployments.filter((d) => d.productId === p.id).length}
                </TableCell>
                <TableCell className="font-mono text-micro">{p.currentReleaseTrain}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </PanelCard>
  );
}

function ContractsPanel({ data }: PanelProps) {
  if (data.contracts.length === 0) {
    return (
      <PanelCard id="c360-contracts" title="Contracts">
        <EmptyState
          title="No contracts yet"
          body="Create the operating contract record once the commercial handoff is complete."
        />
      </PanelCard>
    );
  }
  return (
    <PanelCard
      id="c360-contracts"
      title="Contracts"
      description="Active, future and historical contracts"
    >
      <Table label="Contracts" className="whitespace-nowrap">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Contract</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Effective</TableHeaderCell>
            <TableHeaderCell>Ends</TableHeaderCell>
            <TableHeaderCell>Notice deadline</TableHeaderCell>
            <TableHeaderCell>Renewal</TableHeaderCell>
            {data.canViewCommercial ? (
              <TableHeaderCell className="text-end">Annual value</TableHeaderCell>
            ) : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.contracts.map((c) => {
            const notice = new Date(Date.parse(c.endsAt) - c.noticeDays * 86_400_000).toISOString();
            const noticeDays = daysUntil(notice, data.now);
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <CopyableId value={c.number} label="Contract number" />
                  {c.purchaseOrderRef ? (
                    <span className="block text-micro text-fg-muted">PO {c.purchaseOrderRef}</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    tone={contractStatus[c.status].tone}
                    label={contractStatus[c.status].label}
                  />
                </TableCell>
                <TableCell>{formatDate(c.effectiveAt)}</TableCell>
                <TableCell>
                  {formatDate(c.endsAt)}
                  <span className="block text-micro text-fg-muted">
                    {formatRelativeDays(c.endsAt, data.now)}
                  </span>
                </TableCell>
                <TableCell>
                  {formatDate(notice)}
                  <span
                    className={cn(
                      "block text-micro",
                      noticeDays <= 14 ? "font-medium text-coral-text" : "text-fg-muted",
                    )}
                  >
                    {noticeDays < 0 ? "passed" : formatRelativeDays(notice, data.now)}
                  </span>
                </TableCell>
                <TableCell>
                  {renewalStage[c.renewalStage]}
                  <span className="block text-micro text-fg-muted">
                    {c.renewalType === "auto" ? "Auto renewal" : "Manual renewal"} ·{" "}
                    {data.staff[c.renewalOwnerId]?.name}
                  </span>
                </TableCell>
                {data.canViewCommercial ? (
                  <TableCell className="text-end text-fg">
                    {formatMoney(c.annualContractValue)}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </PanelCard>
  );
}

function EntitlementsPanel({ data }: PanelProps) {
  if (data.licenses.length === 0) {
    return (
      <PanelCard id="c360-entitlements" title="Entitlements">
        <EmptyState
          title="No effective entitlements"
          body="Entitlements appear once a contract creates a signed license."
        />
      </PanelCard>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {data.licenses.map((license) => {
        const latest = license.revisions.at(-1);
        const drift = data.deployments.some(
          (d) => d.licenseId === license.id && d.supportState === "license_mismatch",
        );
        const contract = data.contracts.find((c) => c.id === license.contractId);
        return (
          <PanelCard
            key={license.id}
            id={`c360-ent-${license.id}`}
            title={`Effective rights from ${license.id}`}
            description={`Revision ${latest?.revision ?? "—"} · source contract ${contract?.number ?? "not linked"} · effective ${latest ? formatDate(latest.issuedAt) : "—"}`}
          >
            <CardContent className="flex flex-col gap-3">
              {drift ? (
                <Notice tone="risk" title="Entitlement drift detected">
                  A deployment bound to this license reports metadata that does not match the signed
                  entitlements. A review task is created; the license is never rewritten silently.
                </Notice>
              ) : null}
              <Table label={`Entitlements for ${license.id}`}>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Entitlement</TableHeaderCell>
                    <TableHeaderCell>Machine key</TableHeaderCell>
                    <TableHeaderCell>Value</TableHeaderCell>
                    <TableHeaderCell>Drift</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {latest?.entitlements.map((e) => (
                    <TableRow key={e.key}>
                      <TableCell className="text-fg">{e.label}</TableCell>
                      <TableCell>
                        <code className="font-mono text-micro">{e.key}</code>
                      </TableCell>
                      <TableCell className="text-fg">{e.value}</TableCell>
                      <TableCell>
                        {drift && e.key.startsWith("deployments") ? (
                          <StatusBadge tone="risk" label="Mismatch" />
                        ) : (
                          <StatusBadge tone="healthy" label="Matches" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </PanelCard>
        );
      })}
    </div>
  );
}

function LicensesPanel({ data }: PanelProps) {
  if (data.licenses.length === 0) {
    return (
      <PanelCard id="c360-licenses" title="Licenses">
        <EmptyState
          title="No licenses found"
          body="No license matches this view. Issue a license from an eligible customer entitlement."
        />
      </PanelCard>
    );
  }
  return (
    <PanelCard
      id="c360-licenses"
      title="Licenses"
      description="Current licenses, state, expiry, revisions and delivery"
    >
      <Table label="Licenses" className="whitespace-nowrap">
        <TableHead>
          <TableRow>
            <TableHeaderCell>License</TableHeaderCell>
            <TableHeaderCell>State</TableHeaderCell>
            <TableHeaderCell>Revision</TableHeaderCell>
            <TableHeaderCell>Valid</TableHeaderCell>
            <TableHeaderCell>Deployments allowed</TableHeaderCell>
            <TableHeaderCell>Signing key</TableHeaderCell>
            <TableHeaderCell>Delivery</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.licenses.map((l) => (
            <TableRow key={l.id}>
              <TableCell>
                <Link
                  href={`/licensing/${l.id}`}
                  className="font-mono text-micro font-medium text-fg hover:text-violet-text hover:underline"
                >
                  {l.id}
                </Link>
                <span className="block text-micro text-fg-muted">
                  {data.products.find((p) => p.id === l.productId)?.name}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge
                  tone={licenseState[l.state].tone}
                  label={licenseState[l.state].label}
                />
              </TableCell>
              <TableCell className="tabular">{l.revisions.at(-1)?.revision}</TableCell>
              <TableCell>
                {formatDate(l.validFrom)} – {formatDate(l.expiresAt)}
                <span className="block text-micro text-fg-muted">
                  expires {formatRelativeDays(l.expiresAt, data.now)}
                </span>
              </TableCell>
              <TableCell className="tabular">{l.deploymentAllowance} production</TableCell>
              <TableCell>
                <code className="font-mono text-micro">{l.revisions.at(-1)?.signingKeyId}</code>
              </TableCell>
              <TableCell className="capitalize">{l.deliveryState.replaceAll("_", " ")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PanelCard>
  );
}

function DeploymentsPanel({ data }: PanelProps) {
  if (data.deployments.length === 0) {
    return (
      <PanelCard id="c360-deployments" title="Deployments">
        <EmptyState
          title="No deployments registered"
          body="Register an authorized customer environment after the installation plan is agreed."
        />
      </PanelCard>
    );
  }
  const versions = [...new Set(data.deployments.map((d) => d.releaseVersion))];
  return (
    <div className="flex flex-col gap-4">
      <PanelCard
        id="c360-deployments"
        title="Deployments"
        description="Customer-authorised metadata only; no production access is implied"
      >
        <Table label="Deployments" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Deployment</TableHeaderCell>
              <TableHeaderCell>Environment</TableHeaderCell>
              <TableHeaderCell>Platform</TableHeaderCell>
              <TableHeaderCell>Region</TableHeaderCell>
              <TableHeaderCell>Release</TableHeaderCell>
              <TableHeaderCell>Support state</TableHeaderCell>
              <TableHeaderCell>Last check in</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.deployments.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <Link
                    href={`/deployments/${d.id}`}
                    className="font-medium text-fg hover:text-violet-text hover:underline"
                  >
                    {d.logicalName}
                  </Link>
                  <code className="block font-mono text-micro text-fg-muted">{d.id}</code>
                </TableCell>
                <TableCell>{deploymentEnvironment[d.environment]}</TableCell>
                <TableCell>
                  {d.platform}
                  <span className="block text-micro text-fg-muted">{d.kubernetes}</span>
                </TableCell>
                <TableCell className="font-mono text-micro">{d.region}</TableCell>
                <TableCell className="font-mono text-micro">{d.releaseVersion}</TableCell>
                <TableCell>
                  <StatusBadge
                    tone={supportState[d.supportState].tone}
                    label={supportState[d.supportState].label}
                  />
                </TableCell>
                <TableCell>
                  {d.lastCheckInAt ? (
                    <time dateTime={d.lastCheckInAt} title={formatTimestamp(d.lastCheckInAt)}>
                      {formatRelativeTime(d.lastCheckInAt, data.now)}
                    </time>
                  ) : (
                    <span className="text-fg-muted">Never</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PanelCard>
      <PanelCard id="c360-release-dist" title="Release distribution">
        <CardContent>
          <BarList
            items={versions.map((v) => {
              const count = data.deployments.filter((d) => d.releaseVersion === v).length;
              const release = data.releases.find((r) => r.version === v);
              const risky =
                release?.status === "end_of_support" || release?.status === "deprecated";
              return {
                key: v,
                label: <span className="font-mono">{v}</span>,
                value: count,
                valueLabel: plural(count, "deployment"),
                href: release ? `/releases/${release.id}` : "/releases",
                risk: risky,
                note: release ? release.status.replaceAll("_", " ") : undefined,
                accessibleLabel: `Release ${v}: ${plural(count, "deployment")}${risky ? ", at risk" : ""}`,
              };
            })}
          />
        </CardContent>
      </PanelCard>
    </div>
  );
}

function UsagePanel({ data }: PanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <PanelCard
        id="c360-license-usage"
        title="License usage"
        description="From signed entitlements and approved check-in metadata"
      >
        <CardContent className="flex flex-col gap-4">
          {data.licenses.length === 0 ? (
            <p className="text-dense text-fg-muted">No licenses issued.</p>
          ) : null}
          {data.licenses.map((l) => {
            const used = data.deployments.filter(
              (d) => d.licenseId === l.id && d.environment !== "staging",
            ).length;
            const ratio = Math.min(1, used / Math.max(1, l.deploymentAllowance));
            const over = used > l.deploymentAllowance;
            return (
              <div key={l.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between text-dense">
                  <span className="font-mono text-micro text-fg">{l.id}</span>
                  <span className={over ? "font-medium text-coral-text" : "text-fg-secondary"}>
                    {used} of {l.deploymentAllowance} production and DR deployments
                  </span>
                </div>
                <div
                  role="meter"
                  aria-label={`${l.id} deployment allowance used`}
                  aria-valuemin={0}
                  aria-valuemax={l.deploymentAllowance}
                  aria-valuenow={used}
                  className="h-2 rounded-full bg-violet-subtle"
                >
                  <div
                    className={cn("h-full rounded-full", over ? "bg-coral" : "bg-violet")}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </PanelCard>
      <PanelCard id="c360-adoption" title="Product adoption">
        <EmptyState
          icon={Lock}
          title="Adoption metadata not shared"
          body="This customer has not authorised sharing aggregate feature usage. Apporine never collects production content."
        />
      </PanelCard>
    </div>
  );
}

function SupportPanel({ data }: PanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <Notice title="Case references only">
        Full case content stays in the support platform. This view stores severity, status, SLA and
        links.
      </Notice>
      <PanelCard
        id="c360-support"
        title="Support cases"
        description={`Support tier: ${data.customer.supportTier.replace("_", " ")}`}
      >
        {data.supportCases.length === 0 ? (
          <EmptyState
            title="No support cases"
            body="No case references are linked to this customer."
          />
        ) : (
          <Table label="Support cases">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Case</TableHeaderCell>
                <TableHeaderCell>Severity</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>SLA</TableHeaderCell>
                <TableHeaderCell>Opened</TableHeaderCell>
                <TableHeaderCell>Owner</TableHeaderCell>
                <TableHeaderCell>Release</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.supportCases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <code className="font-mono text-micro text-fg">{c.externalRef}</code>
                    <span className="block text-dense text-fg-secondary">{c.title}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      tone={
                        c.severity === "sev1"
                          ? "critical"
                          : c.severity === "sev2"
                            ? "risk"
                            : "neutral"
                      }
                      label={severityLabel[c.severity]}
                    />
                  </TableCell>
                  <TableCell className="capitalize">{c.status.replaceAll("_", " ")}</TableCell>
                  <TableCell>
                    <StatusBadge
                      tone={
                        c.slaState === "breached"
                          ? "critical"
                          : c.slaState === "at_risk"
                            ? "risk"
                            : "healthy"
                      }
                      label={
                        c.slaState === "within"
                          ? "Within SLA"
                          : c.slaState === "at_risk"
                            ? "At risk"
                            : "Breached"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {formatDate(c.openedAt)}
                    {c.resolvedAt ? (
                      <span className="block text-micro text-fg-muted">
                        resolved {formatDate(c.resolvedAt)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{data.staff[c.ownerId]?.name}</TableCell>
                  <TableCell className="font-mono text-micro">{c.releaseVersion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PanelCard>
    </div>
  );
}

function SuccessPanel({ data }: PanelProps) {
  const statusTone = {
    done: "healthy",
    in_progress: "info",
    not_started: "neutral",
    overdue: "risk",
  } as const;
  const statusLabel = {
    done: "Done",
    in_progress: "In progress",
    not_started: "Not started",
    overdue: "Overdue",
  };
  return (
    <PanelCard
      id="c360-success"
      title="Success plan"
      description={`Customer success owner: ${data.customer.owners.customer_success_owner ? data.staff[data.customer.owners.customer_success_owner]?.name : "not assigned"}`}
    >
      {data.milestones.length === 0 ? (
        <EmptyState
          title="No success plan yet"
          body="Create goals and milestones with an owner, due date and evidence reference."
        />
      ) : (
        <Table label="Success milestones">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Milestone</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Due</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.milestones.map((m) => (
              <TableRow key={m.title}>
                <TableCell className="text-fg">{m.title}</TableCell>
                <TableCell>{data.staff[m.ownerId]?.name}</TableCell>
                <TableCell>
                  {formatDate(m.dueAt)}
                  <span className="block text-micro text-fg-muted">
                    {formatRelativeDays(m.dueAt, data.now)}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={statusTone[m.status]} label={statusLabel[m.status]} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PanelCard>
  );
}

function FinancePanel({ data }: PanelProps) {
  if (!data.canViewCommercial) {
    return (
      <PanelCard id="c360-finance" title="Finance">
        <EmptyState
          icon={Lock}
          title="Finance requires additional access"
          body="Contract value, invoicing and margin need finance or commercial read access."
        />
      </PanelCard>
    );
  }
  const { customer } = data;
  return (
    <div className="flex flex-col gap-4">
      <PanelCard id="c360-finance" title="Commercial value">
        <CardContent>
          <DescriptionList
            columns={2}
            items={[
              {
                term: "Annual contract value",
                value: customer.annualContractValue && formatMoney(customer.annualContractValue),
              },
              { term: "Currency", value: customer.annualContractValue?.currency },
              { term: "Billing frequency", value: data.contracts[0]?.billingFrequency },
              { term: "Purchase order", value: data.contracts[0]?.purchaseOrderRef },
              { term: "Finance system ID", value: customer.references.financeId },
              {
                term: "Invoices",
                value: customer.references.financeId ? "Held in the finance system" : undefined,
              },
            ]}
          />
        </CardContent>
      </PanelCard>
      <Notice title="Cost to serve not yet allocated">
        Apporine cost is attributed by product today. Customer-level allocation and margin estimates
        appear once support time and cloud cost are allocated; no estimate is shown until then.
      </Notice>
    </div>
  );
}

function TimelinePanel({ data }: PanelProps) {
  return (
    <PanelCard
      id="c360-timeline"
      title="Timeline"
      description="Commercial, licensing, deployment, support, success and admin events"
    >
      <CardContent>
        <TimelineList events={data.timeline} staff={data.staff} now={data.now} />
      </CardContent>
    </PanelCard>
  );
}

function AuditPanel({ data }: PanelProps) {
  return (
    <PanelCard id="c360-audit" title="Audit" description="Customer-scoped administrative events">
      {data.audit.length === 0 ? (
        <EmptyState
          title="No audit events match"
          body="Change the time range or filters. Audit visibility may also depend on your role."
        />
      ) : (
        <Table label="Customer audit events" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Timestamp</TableHeaderCell>
              <TableHeaderCell>Actor</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>Object</TableHeaderCell>
              <TableHeaderCell>Result</TableHeaderCell>
              <TableHeaderCell>Reason</TableHeaderCell>
              <TableHeaderCell>Correlation ID</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.audit.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap">{formatTimestamp(e.at)}</TableCell>
                <TableCell>{data.staff[e.actorId]?.name}</TableCell>
                <TableCell className="text-fg">
                  {e.actionLabel}
                  {e.highImpact ? (
                    <StatusBadge tone="info" label="High impact" className="ms-2" />
                  ) : null}
                </TableCell>
                <TableCell>
                  <code className="font-mono text-micro">{e.objectId}</code>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    tone={
                      e.result === "success"
                        ? "healthy"
                        : e.result === "denied"
                          ? "risk"
                          : "critical"
                    }
                    label={
                      e.result === "success"
                        ? "Success"
                        : e.result === "denied"
                          ? "Denied"
                          : "Failed"
                    }
                  />
                </TableCell>
                <TableCell>{e.reason ?? <span className="text-fg-muted">—</span>}</TableCell>
                <TableCell>
                  <CopyableId value={e.correlationId} label="Correlation ID" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PanelCard>
  );
}

const panels: Record<CustomerTabId, (props: PanelProps) => React.ReactNode> = {
  overview: OverviewPanel,
  contacts: ContactsPanel,
  products: ProductsPanel,
  contracts: ContractsPanel,
  entitlements: EntitlementsPanel,
  licenses: LicensesPanel,
  deployments: DeploymentsPanel,
  usage: UsagePanel,
  support: SupportPanel,
  success: SuccessPanel,
  finance: FinancePanel,
  timeline: TimelinePanel,
  audit: AuditPanel,
};

export function CustomerPanel({ tab, data }: { tab: CustomerTabId; data: Customer360 }) {
  const Panel = panels[tab];
  return <Panel data={data} />;
}
