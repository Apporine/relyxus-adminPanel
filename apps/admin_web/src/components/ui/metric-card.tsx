import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Metric card. Every metric drills through to the records behind the number and names
 * its source (spec §8.1, §30.1 acceptance). A restricted metric hides the value rather
 * than showing a misleading zero.
 */
export function MetricCard({
  label,
  value,
  detail,
  href,
  source,
  restricted = false,
  children,
  className,
}: {
  label: string;
  value: string;
  /** Short secondary line, such as "12 new this month". */
  detail?: React.ReactNode;
  /** Drill-through to the filtered records behind the number. */
  href: string;
  /** Human description of the source query, shown as a footnote. */
  source: string;
  restricted?: boolean;
  /** Optional small visual: sparkline, aging bar or distribution. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "group relative flex min-h-36 flex-col rounded-card border border-border bg-surface p-4 shadow-card",
        "focus-within:border-border-strong hover:border-border-strong",
        className,
      )}
    >
      <h2 className="text-dense font-medium text-fg-muted">{label}</h2>
      {restricted ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-body text-fg-muted">
          <Lock aria-hidden="true" className="size-4" />
          Requires finance scope
        </p>
      ) : (
        <>
          <p className="mt-1 text-metric text-fg tabular">{value}</p>
          {detail ? <div className="mt-0.5 text-dense text-fg-secondary">{detail}</div> : null}
          {children ? <div className="mt-3">{children}</div> : null}
        </>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-micro text-fg-muted">
        <span className="line-clamp-2 min-w-0">{source}</span>
        {restricted ? null : (
          <Link
            href={href}
            aria-label={`View records for ${label}`}
            className="inline-flex shrink-0 items-center gap-1 font-medium text-violet-text after:absolute after:inset-0 after:rounded-card hover:underline"
          >
            View records
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        )}
      </div>
    </section>
  );
}
