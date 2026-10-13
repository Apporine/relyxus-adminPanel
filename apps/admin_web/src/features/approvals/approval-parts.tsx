import { CircleCheck, Fingerprint, ShieldCheck, Timer, UserX } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { formatTimeRemaining, isExpiring, msRemaining, windowElapsed } from "@/domain/approvals";
import { approvalState } from "@/domain/status";
import type { ApprovalRequest, ApprovalState, StaffUser } from "@/domain/types";
import { cn } from "@/lib/cn";

export function ApprovalStateBadge({
  request,
  state,
  now,
}: {
  request: ApprovalRequest;
  state: ApprovalState;
  now: Date;
}) {
  if (state === "pending" && isExpiring(request, now)) {
    return <StatusBadge tone="risk" icon={Timer} label="Expiring" />;
  }
  return <StatusBadge tone={approvalState[state].tone} label={approvalState[state].label} />;
}

/**
 * Time left in the approval window, as text plus a thin bar of the window already used.
 * The text carries the meaning; the bar is a glanceable aid.
 */
export function TimeRemaining({
  request,
  now,
  className,
}: {
  request: ApprovalRequest;
  now: Date;
  className?: string;
}) {
  const remaining = msRemaining(request, now);
  const expiring = isExpiring(request, now);
  const used = windowElapsed(request, now);
  return (
    <div className={cn("flex min-w-32 flex-col gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-dense font-medium tabular",
          expiring ? "text-coral-text" : "text-fg-secondary",
        )}
      >
        <Timer aria-hidden="true" className="size-3.5" />
        {formatTimeRemaining(remaining)}
      </span>
      <span aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-surface-sunken">
        <span
          className={cn(
            "block h-full chart-grow-x rounded-full",
            expiring ? "bg-coral" : "bg-linear-to-r from-violet to-chart-primary-2",
          )}
          style={{ width: `${Math.round(used * 100)}%` }}
        />
      </span>
    </div>
  );
}

/** Policy requirements with the step-up and segregation rules called out. */
export function PolicyList({
  request,
  compact = false,
}: {
  request: ApprovalRequest;
  compact?: boolean;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", !compact && "flex-col gap-2")}>
      {request.policy.map((rule) => {
        const Icon = /step up/i.test(rule)
          ? Fingerprint
          : /requester|self/i.test(rule)
            ? UserX
            : /eyes|approver/i.test(rule)
              ? ShieldCheck
              : CircleCheck;
        return (
          <li
            key={rule}
            className={cn(
              "inline-flex items-center gap-1.5 text-dense text-fg-secondary",
              compact && "h-6 rounded-control bg-surface-sunken px-2 text-micro font-medium",
            )}
          >
            <Icon aria-hidden="true" className="size-3.5 shrink-0 text-violet-text" />
            {rule}
          </li>
        );
      })}
    </ul>
  );
}

export function StaffName({ staff, id }: { staff: Record<string, StaffUser>; id?: string }) {
  if (!id) return <span className="text-fg-muted italic">System</span>;
  return staff[id]?.name ?? id;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-subtle to-cyan-subtle text-micro font-semibold text-violet-text",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
