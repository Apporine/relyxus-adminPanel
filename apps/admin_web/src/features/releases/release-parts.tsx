import { Check } from "lucide-react";
import { promotionStages } from "@/domain/fleet";
import { releaseStatus } from "@/domain/status";
import type { CompatibilityEntry, ReleaseStatus } from "@/domain/types";
import { cn } from "@/lib/cn";

/**
 * Promotion stepper (spec §17): Draft, Tested, Approved, Released, Deprecated, End of
 * support. Stages are named in text; the compact dots only show progress.
 */
export function PromotionStepper({
  status,
  compact = false,
}: {
  status: ReleaseStatus;
  compact?: boolean;
}) {
  const at = promotionStages.indexOf(status);
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        {promotionStages.map((stage, i) => (
          <span
            key={stage}
            className={cn(
              "h-1.5 w-4 rounded-full",
              i < at && "bg-chart-primary-2",
              i === at && (i >= 4 ? "bg-coral" : "bg-violet"),
              i > at && "bg-surface-sunken",
            )}
          />
        ))}
      </span>
    );
  }
  return (
    <ol aria-label="Promotion stages" className="flex flex-wrap items-center gap-y-2">
      {promotionStages.map((stage, i) => {
        const done = i < at;
        const current = i === at;
        return (
          <li key={stage} className="flex items-center">
            <span
              aria-current={current ? "step" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-dense font-medium",
                done && "border-violet/30 bg-violet-subtle text-violet-text",
                current &&
                  (i >= 4
                    ? "border-coral bg-coral-subtle text-coral-text"
                    : "border-violet bg-violet text-white shadow-glow"),
                !done && !current && "border-border bg-surface text-fg-muted",
              )}
            >
              {done ? <Check aria-hidden="true" className="size-3.5" /> : null}
              {releaseStatus[stage].label}
            </span>
            {i < promotionStages.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn("mx-1 h-px w-5", i < at ? "bg-violet/40" : "bg-border-strong")}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

const compatStyle: Record<CompatibilityEntry["status"], { label: string; className: string }> = {
  supported: { label: "Supported", className: "bg-cyan-subtle text-cyan-text" },
  conditional: { label: "Conditional", className: "bg-surface-sunken text-fg" },
  unsupported: { label: "Unsupported", className: "bg-coral-subtle text-coral-text" },
};

/** One compatibility cell: status in words plus the Kubernetes range it covers. */
export function CompatibilityCell({ entry }: { entry: CompatibilityEntry }) {
  const style = compatStyle[entry.status];
  return (
    <span
      className={cn(
        "flex min-h-12 min-w-32 flex-col justify-center rounded-control px-2.5 py-1.5",
        style.className,
      )}
      title={entry.note}
    >
      <span className="text-dense font-semibold">{style.label}</span>
      <span className="text-micro">{entry.kubernetes}</span>
    </span>
  );
}
