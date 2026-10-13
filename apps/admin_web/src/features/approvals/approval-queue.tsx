import { ArrowRight, FileCheck2, Inbox, Paperclip } from "lucide-react";
import Link from "next/link";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { SegmentNav } from "@/components/ui/segment-nav";
import {
  approvalViews,
  decisionGuard,
  effectiveState,
  parseApprovalView,
  type ApprovalView,
} from "@/domain/approvals";
import { approvalType } from "@/domain/status";
import type { ApprovalRequest } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatRelativeTime, formatTimestamp } from "@/lib/format";
import { ApprovalStateBadge, Avatar, PolicyList, StaffName, TimeRemaining } from "./approval-parts";
import { loadQueue, type QueueData } from "./load";

/** Approval queue (spec §21, §30.1): Mine, Team, High impact, Expiring, Decided and All. */
export async function ApprovalQueue({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const view = parseApprovalView((await searchParams).view);
  const data = await loadQueue(view);
  return (
    <div className="flex flex-col gap-5">
      <ViewNav view={view} counts={data.counts} />
      <section aria-label={`${approvalViews.find((v) => v.id === view)?.label} requests`}>
        {data.items.length === 0 ? (
          <QueueEmpty view={view} />
        ) : (
          <ul className="flex stagger flex-col gap-3">
            {data.items.map((request) => (
              <li key={request.id}>
                <ApprovalCard request={request} data={data} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ViewNav({ view, counts }: { view: ApprovalView; counts: Record<ApprovalView, number> }) {
  return (
    <SegmentNav
      label="Approval views"
      items={approvalViews.map((v) => ({
        href: `/approvals?view=${v.id}`,
        label: v.label,
        count: counts[v.id],
        current: v.id === view,
      }))}
    />
  );
}

function QueueEmpty({ view }: { view: ApprovalView }) {
  if (view === "mine") {
    return (
      <EmptyState
        icon={Inbox}
        title="Nothing waiting for you"
        body="You have no pending approval requests in the current scope."
        action={
          <Button asChild>
            <Link href="/approvals?view=decided">View decided requests</Link>
          </Button>
        }
        className="rounded-card border border-dashed border-border-strong bg-surface"
      />
    );
  }
  return (
    <EmptyState
      icon={FileCheck2}
      title="No requests in this view"
      body="Requests appear here when they match this view. Decided requests stay in Decided."
      className="rounded-card border border-dashed border-border-strong bg-surface"
    />
  );
}

/**
 * One request as a card (spec §21): requester, target, requested action, reason, diff,
 * required policy, time remaining and supporting evidence.
 */
function ApprovalCard({ request, data }: { request: ApprovalRequest; data: QueueData }) {
  const state = effectiveState(request, data.now);
  const guard = decisionGuard(request, data.me.id, data.now);
  const titleId = `${request.id}-title`;
  const changed = request.diff.filter((line) => line.before !== line.after).slice(0, 2);
  const requester = data.staff[request.requesterId]?.name ?? request.requesterId;
  const customer = request.customerId ? data.customerNames[request.customerId] : undefined;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "group relative overflow-hidden rounded-card border border-border bg-surface shadow-card",
        "transition-[transform,box-shadow,border-color] duration-(--ap-duration-panel) ease-(--ap-ease-emphasized)",
        "hover:-translate-y-0.5 hover:border-violet/30 hover:shadow-lift",
        request.highImpact && state === "pending" && "border-s-[3px] border-s-coral",
      )}
    >
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Tag>{approvalType[request.type]}</Tag>
            {request.highImpact ? <StatusBadge tone="critical" label="High impact" /> : null}
            {guard.canDecide ? (
              <Tag className="bg-violet-subtle text-violet-text">Awaiting your decision</Tag>
            ) : guard.block === "self_approval" ? (
              <Tag>Your request</Tag>
            ) : null}
            <span className="font-mono text-micro text-fg-muted">{request.id}</span>
          </div>
          <h2 id={titleId} className="mt-2 text-card-title text-fg">
            <Link
              href={`/approvals/${request.id}`}
              className="after:absolute after:inset-0 after:rounded-card hover:text-violet-text"
            >
              {request.title}
            </Link>
          </h2>
          <p className="mt-1 line-clamp-2 text-dense text-fg-secondary">{request.reason}</p>

          {changed.length ? (
            <dl className="mt-3 flex flex-col gap-1">
              {changed.map((line) => (
                <div key={line.field} className="flex flex-wrap items-baseline gap-x-2 text-dense">
                  <dt className="text-fg-muted">{line.field}</dt>
                  <dd className="flex items-baseline gap-1.5">
                    <del className="text-fg-muted decoration-coral">{line.before}</del>
                    <ArrowRight aria-hidden="true" className="size-3 self-center text-fg-muted" />
                    <span className="sr-only">changes to</span>
                    <ins className="rounded-sm bg-violet-subtle px-1 font-medium text-fg no-underline">
                      {line.after}
                    </ins>
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <PolicyList request={request} compact />
            {request.evidence?.length ? (
              <span className="inline-flex items-center gap-1 text-micro text-fg-muted">
                <Paperclip aria-hidden="true" className="size-3.5" />
                {request.evidence.length} evidence{" "}
                {request.evidence.length === 1 ? "item" : "items"}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-3 lg:border-s lg:border-t-0 lg:ps-4 lg:pt-0">
          <ApprovalStateBadge request={request} state={state} now={data.now} />
          {state === "pending" ? (
            <TimeRemaining request={request} now={data.now} />
          ) : (
            <p className="text-dense text-fg-secondary">
              {request.decidedAt ? (
                <time dateTime={request.decidedAt}>{formatTimestamp(request.decidedAt)}</time>
              ) : (
                <>
                  Expired{" "}
                  <time dateTime={request.expiresAt}>{formatTimestamp(request.expiresAt)}</time>
                </>
              )}
              {request.decidedById ? (
                <>
                  <br />
                  by <StaffName staff={data.staff} id={request.decidedById} />
                </>
              ) : null}
            </p>
          )}
          <div className="mt-auto flex items-center gap-2 text-dense">
            <Avatar name={requester} />
            <span className="min-w-0">
              <span className="block truncate font-medium text-fg">{requester}</span>
              <span className="block text-micro text-fg-muted">
                {customer ? `${customer} · ` : ""}
                {formatRelativeTime(request.createdAt, data.now.toISOString())}
              </span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ApprovalQueueSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <Skeleton className="h-10 w-[34rem] max-w-full" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-44 rounded-card" />
      ))}
    </div>
  );
}
