import { Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Empty state with spec §31.1 copy: title, body and one clear next action. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="relative mb-2 inline-flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-violet-subtle to-cyan-subtle text-violet-text shadow-[inset_0_0_0_1px_rgb(112_64_255/0.12)]">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      ) : null}
      <p className="text-card-title text-fg">{title}</p>
      <p className="max-w-sm text-body text-fg-muted">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-shimmer rounded-control bg-surface-sunken shimmer", className)}
      {...props}
    />
  );
}

type NoticeTone = "info" | "risk" | "critical";

const noticeStyles: Record<NoticeTone, { icon: LucideIcon; className: string }> = {
  info: { icon: Info, className: "border-border-strong bg-surface text-fg-secondary" },
  risk: { icon: TriangleAlert, className: "border-coral/60 bg-coral-subtle text-fg" },
  critical: { icon: OctagonAlert, className: "border-coral bg-coral-subtle text-fg" },
};

/**
 * Inline notice for boundaries, partial data and failures. Error notices state what
 * failed, whether data changed, and what to do next (spec §32).
 */
export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: toneClass } = noticeStyles[tone];
  return (
    <div
      role={tone === "info" ? "note" : "status"}
      className={cn("flex gap-3 rounded-card border px-4 py-3", toneClass, className)}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "info" ? "text-fg-muted" : "text-coral-text",
        )}
      />
      <div className="min-w-0 text-body">
        <p className="font-semibold text-fg">{title}</p>
        {children ? <div className="mt-0.5 text-fg-secondary">{children}</div> : null}
      </div>
    </div>
  );
}

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface px-1 font-mono text-[11px] text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}
