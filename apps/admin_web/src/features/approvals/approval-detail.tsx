import {
  Check,
  ExternalLink,
  Fingerprint,
  Link2,
  MessageSquareDiff,
  Paperclip,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableId } from "@/components/ui/copyable-id";
import { DescriptionList } from "@/components/ui/description-list";
import { Field, FieldHint, Label, Textarea } from "@/components/ui/field";
import { Notice, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import {
  decisionCopy,
  formatTimeRemaining,
  msRemaining,
  requiredContext,
} from "@/domain/approvals";
import { approvalType } from "@/domain/status";
import { DiffTable } from "@/features/licensing/license-tabs";
import { formatTimestamp } from "@/lib/format";
import { ApprovalStateBadge, Avatar, PolicyList, StaffName, TimeRemaining } from "./approval-parts";
import { loadApproval, type ApprovalDetailData } from "./load";

/** Approval detail (spec §30.1): make a high impact decision with full context. */
export async function ApprovalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadApproval(id);
  if (!data) notFound();
  const { request, state, now } = data;
  const customer = request.customerId ? data.customerNames[request.customerId] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Approvals", href: "/approvals" }, { label: request.id }]} />
        <PageHeader
          title={request.title}
          description={
            <>
              {approvalType[request.type]} requested by{" "}
              <StaffName staff={data.staff} id={request.requesterId} />
            </>
          }
          meta={
            <>
              <CopyableId value={request.id} label="Request ID" />
              <ApprovalStateBadge request={request} state={state} now={now} />
              {request.highImpact ? <StatusBadge tone="critical" label="High impact" /> : null}
              {request.requiresStepUp ? <Tag>Step-up authentication</Tag> : null}
            </>
          }
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 stagger flex-col gap-4">
          <Card aria-labelledby="summary-title">
            <CardHeader>
              <CardTitle id="summary-title">Action summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <blockquote className="rounded-control border-s-[3px] border-violet bg-violet-subtle/50 px-4 py-3 text-body text-fg">
                {request.reason}
              </blockquote>
              <DescriptionList
                columns={2}
                items={[
                  { term: "Requested action", value: approvalType[request.type] },
                  {
                    term: "Target",
                    value: data.target ? (
                      <Link
                        href={data.target}
                        className="font-mono text-violet-text hover:underline"
                      >
                        {request.targetId}
                      </Link>
                    ) : (
                      <span className="font-mono">{request.targetId}</span>
                    ),
                  },
                  {
                    term: "Customer",
                    value:
                      customer && request.customerId ? (
                        <Link
                          href={`/customers/${request.customerId}`}
                          className="text-violet-text hover:underline"
                        >
                          {customer}
                        </Link>
                      ) : undefined,
                  },
                  {
                    term: "Requester",
                    value: <StaffName staff={data.staff} id={request.requesterId} />,
                  },
                  { term: "Requested", value: formatTimestamp(request.createdAt) },
                  {
                    term: "Expires",
                    value: `${formatTimestamp(request.expiresAt)}${
                      state === "pending"
                        ? ` · ${formatTimeRemaining(msRemaining(request, now))}`
                        : ""
                    }`,
                  },
                  {
                    term: "Authentication",
                    value: request.requiresStepUp
                      ? "Step-up authentication at decision time"
                      : "Current session",
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card aria-labelledby="diff-title">
            <CardHeader>
              <div>
                <CardTitle id="diff-title">Before and after</CardTitle>
                <CardDescription>Exactly what changes if this request is approved.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <DiffTable label={`Changes requested in ${request.id}`} lines={request.diff} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card aria-labelledby="impact-title">
              <CardHeader>
                <CardTitle id="impact-title">Impact and affected records</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2.5">
                  {request.impact.map((line) => (
                    <li key={line} className="flex gap-2.5 text-body text-fg-secondary">
                      <TriangleAlert
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-coral-text"
                      />
                      {line}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card aria-labelledby="evidence-title">
              <CardHeader>
                <CardTitle id="evidence-title">Evidence</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {request.evidence?.length ? (
                  <ul className="flex flex-col gap-2">
                    {request.evidence.map((item) => (
                      <li key={item.reference} className="flex items-start gap-2.5 text-body">
                        {item.href ? (
                          <Link2
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0 text-violet-text"
                          />
                        ) : (
                          <Paperclip
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0 text-fg-muted"
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block text-micro text-fg-muted">{item.label}</span>
                          {item.href ? (
                            <Link href={item.href} className="text-violet-text hover:underline">
                              {item.reference}
                            </Link>
                          ) : (
                            <span className="text-fg">{item.reference}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body text-fg-muted italic">No evidence attached.</p>
                )}
                <div>
                  <p className="text-micro font-medium text-fg-muted">
                    Context required for {approvalType[request.type].toLowerCase()}
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {requiredContext[request.type].map((item) => (
                      <li key={item}>
                        <Tag>{item}</Tag>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <History data={data} />
        </div>

        <DecisionPanel data={data} />
      </div>
    </div>
  );
}

function History({ data }: { data: ApprovalDetailData }) {
  return (
    <Card aria-labelledby="history-title">
      <CardHeader>
        <div>
          <CardTitle id="history-title">Decision history</CardTitle>
          <CardDescription>
            Decisions are immutable audit events. Reopening needs a new request.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="relative flex flex-col gap-5 before:absolute before:inset-y-1 before:start-[13px] before:w-px before:bg-border">
          {data.history.map((entry) => {
            const name = entry.actorId ? (data.staff[entry.actorId]?.name ?? entry.actorId) : "";
            return (
              <li key={entry.label} className="relative flex gap-3">
                {name ? (
                  <Avatar name={name} className="ring-4 ring-surface" />
                ) : (
                  <span
                    aria-hidden="true"
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken ring-4 ring-surface"
                  >
                    <span className="size-2 rounded-full bg-fg-disabled" />
                  </span>
                )}
                <div className="min-w-0 pt-0.5">
                  <p className="text-body text-fg">
                    <span className="font-semibold">{entry.label}</span>
                    {name ? ` by ${name}` : ""}
                  </p>
                  <p className="text-micro text-fg-muted">
                    <time dateTime={entry.at}>{formatTimestamp(entry.at)}</time>
                  </p>
                  {entry.note ? (
                    <p className="mt-1 text-dense text-fg-secondary">{entry.note}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function DecisionField({ id, label, hint }: { id: string; label: string; hint: string }) {
  return (
    <Field>
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} name={id} required />
      <FieldHint>{hint}</FieldHint>
    </Field>
  );
}

/** Decision panel: who decides, under which policy, and the decision controls. */
function DecisionPanel({ data }: { data: ApprovalDetailData }) {
  const { request, guard, state, now } = data;
  return (
    <aside
      aria-labelledby="decision-title"
      className="flex flex-col gap-4 xl:sticky xl:top-[calc(var(--ap-topbar-height)+1.5rem)]"
    >
      <Card className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-violet via-chart-primary-2 to-cyan"
        />
        <CardHeader>
          <CardTitle id="decision-title">Decision</CardTitle>
          <ApprovalStateBadge request={request} state={state} now={now} />
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {state === "pending" ? <TimeRemaining request={request} now={now} /> : null}

          <div>
            <p className="text-micro font-medium text-fg-muted">Eligible approvers</p>
            <ul className="mt-2 flex flex-col gap-2">
              {request.approverIds.map((approverId) => {
                const name = data.staff[approverId]?.name ?? approverId;
                return (
                  <li key={approverId} className="flex items-center gap-2.5 text-dense">
                    <Avatar name={name} />
                    <span className="min-w-0 flex-1 truncate text-fg">{name}</span>
                    {approverId === data.me.id ? <Tag>You</Tag> : null}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-micro text-fg-muted">
              Excluded by segregation of duties:{" "}
              {request.excludedApproverIds.map((sid, i) => (
                <span key={sid}>
                  {i > 0 ? ", " : ""}
                  <StaffName staff={data.staff} id={sid} />
                </span>
              ))}
            </p>
          </div>

          <div>
            <p className="text-micro font-medium text-fg-muted">Policy requirements</p>
            <div className="mt-2">
              <PolicyList request={request} />
            </div>
          </div>

          {guard.canDecide ? (
            <DecisionActions data={data} />
          ) : (
            <div className="flex flex-col gap-3">
              <Notice title="You cannot decide this request" className="text-dense">
                <span id="decision-unavailable">{guard.reason}</span>
              </Notice>
              {state === "pending" ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="primary" disabled aria-describedby="decision-unavailable">
                    <Check aria-hidden="true" />
                    {decisionCopy.approve.label}
                  </Button>
                  <Button disabled aria-describedby="decision-unavailable">
                    <X aria-hidden="true" />
                    {decisionCopy.reject.label}
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          {data.target ? (
            <Button asChild variant="ghost" className="justify-start">
              <Link href={data.target}>
                <ExternalLink aria-hidden="true" />
                Open target
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </aside>
  );
}

function DecisionActions({ data }: { data: ApprovalDetailData }) {
  const { request } = data;
  return (
    <div className="flex flex-col gap-2 [&_button]:w-full">
      <DesignPreviewDialog
        trigger={decisionCopy.approve.label}
        triggerVariant="primary"
        triggerIcon={<Check aria-hidden="true" />}
        title={decisionCopy.approve.title}
        description={decisionCopy.approve.message}
        confirmLabel={decisionCopy.approve.label}
      >
        <DescriptionList
          items={[
            { term: "Request", value: `${request.id} · ${request.title}` },
            { term: "Policy", value: request.policy.join(" · ") },
          ]}
        />
        {request.requiresStepUp ? (
          <Notice title="Step-up authentication required">
            <span className="inline-flex items-center gap-1.5">
              <Fingerprint aria-hidden="true" className="size-4" />
              You re-authenticate before the approval is recorded.
            </span>
          </Notice>
        ) : null}
        <Field>
          <Label htmlFor="approve-note">Decision note</Label>
          <Textarea id="approve-note" name="note" />
          <FieldHint>Optional. Stored with the decision in audit.</FieldHint>
        </Field>
      </DesignPreviewDialog>
      <div className="flex flex-col gap-2">
        <DesignPreviewDialog
          trigger={decisionCopy.reject.label}
          triggerIcon={<X aria-hidden="true" />}
          title={decisionCopy.reject.title}
          description={decisionCopy.reject.message}
          confirmLabel={decisionCopy.reject.label}
        >
          <DecisionField
            id="reject-reason"
            label="Reason"
            hint="The requester and audit see this reason."
          />
        </DesignPreviewDialog>
        <DesignPreviewDialog
          trigger={decisionCopy.requestChanges.label}
          triggerVariant="ghost"
          triggerIcon={<MessageSquareDiff aria-hidden="true" />}
          title={decisionCopy.requestChanges.title}
          description={decisionCopy.requestChanges.message}
          confirmLabel={decisionCopy.requestChanges.label}
        >
          <DecisionField
            id="changes-comment"
            label="What needs to change"
            hint="Be specific so the requester can resubmit."
          />
        </DesignPreviewDialog>
      </div>
    </div>
  );
}

export function ApprovalDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-16 w-2/3" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
        <Skeleton className="h-96 rounded-card" />
      </div>
    </div>
  );
}
