import { CalendarPlus, ClipboardPlus, FileSignature, ListChecks } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/description-list";
import { Field, FieldHint, Input, Label, Textarea } from "@/components/ui/field";
import { Notice, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { DiffTable } from "@/features/licensing/license-tabs";
import { entitlementRows } from "@/domain/entitlements";
import { daysToEnd, noticeDeadline, noticePassed, renewalStages } from "@/domain/renewals";
import { healthStatus, priority as priorityPresentation, renewalStage } from "@/domain/status";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney, formatPercent, plural } from "@/lib/format";
import { getContract } from "@/server/data";
import { loadCustomer360 } from "../customer-360/load";
import { loadCommercial, openRisks } from "./load";

const factor = {
  ok: { label: "Good", className: "text-cyan-text" },
  attention: { label: "Attention", className: "text-fg-secondary" },
  risk: { label: "Risk", className: "text-coral-text" },
  not_measured: { label: "Not measured", className: "text-fg-muted" },
} as const;

/**
 * Renewal workspace (spec §30.1): countdown and value, health and risk, contract summary,
 * entitlement change proposal, tasks and stage.
 */
export async function RenewalWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getContract(id);
  if (!contract) notFound();
  const [data, c360] = await Promise.all([loadCommercial(), loadCustomer360(contract.customerId)]);
  if (!c360) notFound();
  const { customer } = c360;
  const days = daysToEnd(contract, data.now);
  const passed = noticePassed(contract, data.now);
  const risks = openRisks(customer.id, data);
  const license = data.licenses.find((l) => l.contractId === contract.id);
  const proposals = license
    ? entitlementRows({
        customerId: customer.id,
        productId: license.productId,
        definitions: data.definitions,
        contract,
        license,
        records: data.records,
        observed: data.observed,
      }).filter((row) => row.sources.contract !== row.sources.license)
    : [];
  const openCases = c360.supportCases.filter((s) => s.status !== "resolved");
  const uplift = contract.renewalTarget
    ? contract.renewalTarget.amountMinor / contract.annualContractValue.amountMinor - 1
    : undefined;
  const atRisk = customer.health === "at_risk" || customer.health === "critical";
  const stageIndex = renewalStages.indexOf(contract.renewalStage);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Commercial", href: "/commercial" },
            { label: "Renewal radar", href: "/commercial/renewals" },
            { label: customer.displayName },
          ]}
        />
        <PageHeader
          title={`Renewal: ${customer.displayName}`}
          description={`${contract.number} ends ${formatDate(contract.endsAt)}`}
          actions={
            <>
              <DesignPreviewDialog
                trigger="Request entitlement review"
                triggerIcon={<ListChecks aria-hidden="true" />}
                title="Request entitlement review"
                description="Ask licensing to review entitlement changes for this renewal before the proposal is sent."
                confirmLabel="Request review"
              >
                <Field>
                  <Label htmlFor="review-note">What should change</Label>
                  <Textarea id="review-note" name="note" required />
                </Field>
              </DesignPreviewDialog>
              <DesignPreviewDialog
                trigger="Schedule QBR"
                triggerIcon={<CalendarPlus aria-hidden="true" />}
                title="Schedule QBR"
                description="Record a quarterly business review with the customer's executive sponsor."
                confirmLabel="Schedule QBR"
              >
                <Field>
                  <Label htmlFor="qbr-date">Date</Label>
                  <Input id="qbr-date" name="date" type="date" required />
                </Field>
              </DesignPreviewDialog>
              <DesignPreviewDialog
                trigger="Create task"
                triggerIcon={<ClipboardPlus aria-hidden="true" />}
                title="Create task"
                description={`Create a renewal task for ${customer.displayName}.`}
                confirmLabel="Create task"
              >
                <Field>
                  <Label htmlFor="renewal-task">Title</Label>
                  <Input id="renewal-task" name="title" required />
                </Field>
              </DesignPreviewDialog>
              <DesignPreviewDialog
                trigger="Create renewal proposal"
                triggerVariant="primary"
                triggerIcon={<FileSignature aria-hidden="true" />}
                title="Create renewal proposal"
                description="Draft the renewal proposal from the current contract, target value and proposed entitlement changes."
                confirmLabel="Create proposal"
              >
                <Field>
                  <Label htmlFor="proposal-term">Term in months</Label>
                  <Input id="proposal-term" name="term" type="number" defaultValue={12} required />
                </Field>
                <Field>
                  <Label htmlFor="proposal-notes">Notes for the customer</Label>
                  <Textarea id="proposal-notes" name="notes" />
                  <FieldHint>
                    Proposals are reviewed by the commercial owner before sending.
                  </FieldHint>
                </Field>
              </DesignPreviewDialog>
            </>
          }
        />
      </div>

      <ol aria-label="Renewal stages" className="flex flex-wrap gap-1.5">
        {renewalStages.map((stage, i) => (
          <li
            key={stage}
            aria-current={i === stageIndex ? "step" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3 text-dense font-medium",
              i < stageIndex &&
                stage !== "lost" &&
                "border-violet/30 bg-violet-subtle text-violet-text",
              i === stageIndex && "border-violet bg-violet text-white shadow-glow",
              i > stageIndex && "border-border bg-surface text-fg-muted",
            )}
          >
            {renewalStage[stage]}
          </li>
        ))}
      </ol>

      <section
        aria-label="Renewal summary"
        className="grid stagger grid-cols-2 gap-4 xl:grid-cols-4"
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-card border p-4 shadow-card",
            passed ? "border-coral/50 bg-coral-subtle" : "border-border bg-surface",
          )}
        >
          <p className="text-dense font-medium text-fg-muted">Renewal countdown</p>
          <p className="mt-1 text-metric text-fg tabular">{days >= 0 ? days : 0} days</p>
          <p
            className={cn(
              "mt-0.5 text-dense",
              passed ? "font-medium text-coral-text" : "text-fg-secondary",
            )}
          >
            Notice {passed ? "deadline passed" : "due"} {formatDate(noticeDeadline(contract))}
          </p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4 shadow-card">
          <p className="text-dense font-medium text-fg-muted">Current and target value</p>
          {data.canViewCommercial ? (
            <>
              <p className="mt-1 text-metric text-fg tabular">
                {formatMoney(contract.annualContractValue)}
              </p>
              <p className="mt-0.5 text-dense text-fg-secondary">
                Target {contract.renewalTarget ? formatMoney(contract.renewalTarget) : "not set"}
                {uplift !== undefined ? ` (${uplift >= 0 ? "+" : ""}${formatPercent(uplift)})` : ""}
              </p>
            </>
          ) : (
            <p className="mt-2 text-body text-fg-muted">Requires finance scope</p>
          )}
        </div>
        <div className="rounded-card border border-border bg-surface p-4 shadow-card">
          <p className="text-dense font-medium text-fg-muted">Health</p>
          <p className="mt-1 text-metric text-fg tabular">{c360.score} / 100</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={healthStatus[customer.health].tone}
              label={healthStatus[customer.health].label}
            />
            {atRisk && data.canViewCommercial ? (
              <span className="text-dense font-medium text-coral-text">Value at risk</span>
            ) : null}
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface p-4 shadow-card">
          <p className="text-dense font-medium text-fg-muted">Support burden</p>
          <p className="mt-1 text-metric text-fg tabular">{openCases.length}</p>
          <p className="mt-0.5 text-dense text-fg-secondary">
            {plural(openCases.filter((s) => s.slaState !== "within").length, "SLA concern")}
          </p>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card aria-labelledby="contract-summary-title">
            <CardHeader>
              <CardTitle id="contract-summary-title">Contract summary</CardTitle>
              <Link
                href={`/commercial/contracts/${contract.id}`}
                className="text-dense font-medium text-violet-text hover:underline"
              >
                Open contract
              </Link>
            </CardHeader>
            <CardContent>
              <DescriptionList
                columns={2}
                items={[
                  { term: "Contract", value: contract.number },
                  { term: "Effective", value: formatDate(contract.effectiveAt) },
                  { term: "Ends", value: formatDate(contract.endsAt) },
                  { term: "Notice period", value: `${contract.noticeDays} days` },
                  {
                    term: "Renewal type",
                    value: contract.renewalType === "auto" ? "Automatic" : "Manual",
                  },
                  { term: "Renewal owner", value: data.staff[contract.renewalOwnerId]?.name },
                ]}
              />
            </CardContent>
          </Card>

          <Card aria-labelledby="proposal-title">
            <CardHeader>
              <div>
                <CardTitle id="proposal-title">Proposed entitlement changes</CardTitle>
                <CardDescription>
                  Contract scope that the signed license does not carry yet.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className={cn(proposals.length && "px-0 pb-2")}>
              {proposals.length ? (
                <DiffTable
                  label={`Proposed changes for ${contract.number}`}
                  lines={proposals.map((row) => ({
                    field: row.definition.label,
                    before: row.sources.license ?? "—",
                    after: row.sources.contract ?? "—",
                  }))}
                />
              ) : (
                <p className="text-body text-fg-muted">
                  No entitlement changes proposed. The renewal keeps the current scope.
                </p>
              )}
            </CardContent>
          </Card>

          <Card aria-labelledby="tasks-title">
            <CardHeader>
              <CardTitle id="tasks-title">Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {c360.tasks.length ? (
                <ul className="flex flex-col gap-3">
                  {c360.tasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-3">
                      <StatusBadge
                        tone={priorityPresentation[task.priority].tone}
                        label={priorityPresentation[task.priority].label}
                      />
                      <div className="min-w-0">
                        <p className="text-body text-fg">{task.title}</p>
                        <p className="text-micro text-fg-muted">
                          {data.staff[task.ownerId]?.name} · due {formatDate(task.dueAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body text-fg-muted">No open tasks for this customer.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside aria-label="Health and risk" className="flex flex-col gap-4">
          <Card aria-labelledby="risks-title">
            <CardHeader>
              <CardTitle id="risks-title">Open risks</CardTitle>
              <span className="text-dense text-fg-muted tabular">{risks.length}</span>
            </CardHeader>
            <CardContent>
              {risks.length ? (
                <ul className="flex list-disc flex-col gap-1 ps-5 text-dense text-fg-secondary">
                  {risks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-body text-fg-muted">No open risks.</p>
              )}
            </CardContent>
          </Card>
          <Card aria-labelledby="factors-title">
            <CardHeader>
              <CardTitle id="factors-title">Health factors</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {c360.factors.map((f) => (
                  <li key={f.key} className="flex items-baseline justify-between gap-3 text-dense">
                    <span className="text-fg">{f.label}</span>
                    <span className={cn("font-medium", factor[f.status].className)}>
                      {factor[f.status].label}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-micro text-fg-muted">
                Advisory score with illustrative weights.
              </p>
            </CardContent>
          </Card>
          {passed ? (
            <Notice tone="risk" title="Notice deadline passed">
              The contract {contract.renewalType === "auto" ? "renews automatically" : "ends"}{" "}
              unless terms are agreed. Confirm the position with the customer.
            </Notice>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export function RenewalWorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-20 w-2/3" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-card" />
        ))}
      </div>
    </div>
  );
}
