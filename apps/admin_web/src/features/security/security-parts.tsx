import { StatusBadge, type BadgeTone } from "@/components/ui/badge";
import { SegmentNav } from "@/components/ui/segment-nav";
import { ContentSkeleton } from "@/components/ui/skeletons";
import type {
  CredentialStatus,
  FindingSeverity,
  PostureState,
  ReviewStatus,
} from "@/domain/security";
import type { BreakGlassState, ReviewDisposition, SigningKey } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

export type SecurityView =
  "posture" | "staff" | "roles" | "reviews" | "clients" | "keys" | "break-glass" | "data-access";

const items: { id: SecurityView; href: string; label: string }[] = [
  { id: "posture", href: "/security", label: "Posture" },
  { id: "staff", href: "/security/staff", label: "Staff access" },
  { id: "roles", href: "/security/roles", label: "Roles" },
  { id: "reviews", href: "/security/access-reviews", label: "Access reviews" },
  { id: "clients", href: "/security/api-clients", label: "API clients" },
  { id: "keys", href: "/security/signing-keys", label: "Signing keys" },
  { id: "break-glass", href: "/security/break-glass", label: "Break glass" },
  { id: "data-access", href: "/security/data-access", label: "Sensitive data access" },
];

export function SecurityNav({ current }: { current: SecurityView }) {
  return (
    <SegmentNav
      label="Security views"
      items={items.map((i) => ({ href: i.href, label: i.label, current: i.id === current }))}
    />
  );
}

export function SecuritySkeleton() {
  return <ContentSkeleton label="security data" metrics={4} columns={7} />;
}

type Presentation = { label: string; tone: BadgeTone };

export const postureLabel: Record<PostureState, Presentation> = {
  healthy: { label: "Healthy", tone: "healthy" },
  attention: { label: "Attention", tone: "risk" },
  overdue_review: { label: "Overdue review", tone: "critical" },
  key_rotation_due: { label: "Key rotation due", tone: "risk" },
};

export const severityLabel: Record<FindingSeverity, Presentation> = {
  high: { label: "High", tone: "critical" },
  medium: { label: "Medium", tone: "risk" },
  low: { label: "Low", tone: "neutral" },
};

export const reviewStatusLabel: Record<ReviewStatus, Presentation> = {
  open: { label: "Open", tone: "info" },
  overdue: { label: "Overdue", tone: "critical" },
  closed: { label: "Closed", tone: "neutral" },
};

export const dispositionLabel: Record<ReviewDisposition, Presentation> = {
  pending: { label: "Pending", tone: "risk" },
  keep: { label: "Keep", tone: "healthy" },
  reduce: { label: "Reduce", tone: "info" },
  remove: { label: "Remove", tone: "neutral" },
};

export const credentialLabel: Record<CredentialStatus, Presentation> = {
  current: { label: "Current", tone: "healthy" },
  due_soon: { label: "Rotation due soon", tone: "risk" },
  overdue: { label: "Rotation overdue", tone: "critical" },
  inactive: { label: "Not in use", tone: "neutral" },
};

export const keyStatusLabel: Record<SigningKey["status"], Presentation> = {
  planned: { label: "Planned", tone: "info" },
  active: { label: "Active signing", tone: "healthy" },
  verify_only: { label: "Verify only", tone: "neutral" },
  retired: { label: "Retired", tone: "neutral" },
};

export const breakGlassLabel: Record<BreakGlassState, Presentation> = {
  requested: { label: "Requested", tone: "info" },
  active: { label: "Active", tone: "critical" },
  expired: { label: "Expired", tone: "neutral" },
  ended: { label: "Ended", tone: "neutral" },
  rejected: { label: "Rejected", tone: "neutral" },
};

export function Status({ value }: { value: Presentation }) {
  return <StatusBadge tone={value.tone} label={value.label} />;
}

/** Progress bar with the count always printed; the bar only aids scanning. */
export function Progress({
  done,
  total,
  label,
  risk = false,
}: {
  done: number;
  total: number;
  label: string;
  risk?: boolean;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-sunken"
      >
        <span
          className={cn(
            "block h-full chart-grow-x rounded-full",
            risk ? "bg-chart-critical" : "bg-linear-to-r from-violet to-cyan",
          )}
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </span>
      <span className="text-micro text-fg-secondary tabular">
        {done} of {total} {label}
      </span>
    </span>
  );
}

const keyBar: Record<SigningKey["status"], string> = {
  planned: "bg-violet-subtle border border-dashed border-violet/60",
  active: "bg-linear-to-r from-violet to-cyan",
  verify_only: "bg-chart-neutral",
  retired: "bg-surface-sunken border border-border-strong",
};

/**
 * Signing key timeline: each key's signing period, its verify-only overlap and the
 * next rotation, against today. Dates are printed; the bars only aid scanning.
 */
export function KeyTimeline({ keys, now }: { keys: SigningKey[]; now: string }) {
  // A planned key runs up to the active key's next rotation, its planned cutover.
  const cutover = keys.find((k) => k.status === "active")?.nextRotationAt;
  const untilOf = (k: SigningKey) =>
    k.status === "planned" ? cutover : (k.retiredAt ?? k.overlapEndsAt ?? k.nextRotationAt);
  const starts = keys.map((k) => Date.parse(k.activatedAt ?? k.createdAt));
  const ends = keys.map((k) => Date.parse(untilOf(k) ?? k.createdAt));
  const min = Math.min(...starts, Date.parse(now));
  const max = Math.max(...ends, Date.parse(now)) + 30 * 86_400_000;
  const pos = (t: number) => ((t - min) / (max - min)) * 100;
  const today = pos(Date.parse(now));

  return (
    <ol className="relative flex flex-col gap-3" aria-label="Signing key timeline">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-px bg-cyan"
        style={{ left: `calc(8.5rem + (100% - 8.5rem) * ${today / 100})` }}
      />
      {keys.map((key, i) => {
        const start = starts[i]!;
        const end = ends[i]!;
        const until = untilOf(key);
        return (
          <li key={key.id} className="grid grid-cols-[8.5rem_1fr] items-center gap-0">
            <span className="min-w-0 pe-3">
              <span className="block truncate font-mono text-micro text-fg">{key.id}</span>
              <span className="block text-micro text-fg-muted">
                {keyStatusLabel[key.status].label}
                {until
                  ? ` · ${key.status === "planned" ? "cutover" : "to"} ${formatDate(until)}`
                  : ""}
              </span>
            </span>
            <span className="relative h-3 rounded-full">
              <span
                aria-hidden="true"
                className={cn("absolute inset-y-0 chart-grow-x rounded-full", keyBar[key.status])}
                style={{
                  left: `${pos(start)}%`,
                  width: `${Math.max(1.5, pos(end) - pos(start))}%`,
                  ["--ap-delay" as string]: `${i * 60}ms`,
                }}
              />
            </span>
          </li>
        );
      })}
      <li className="grid grid-cols-[8.5rem_1fr] text-micro text-fg-muted">
        <span />
        <span className="relative h-4">
          <span
            className="absolute -translate-x-1/2 font-medium whitespace-nowrap text-cyan-text"
            style={{ left: `${today}%` }}
          >
            Today
          </span>
        </span>
      </li>
    </ol>
  );
}
