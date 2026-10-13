import type { Environment } from "@/domain/types";
import { cn } from "@/lib/cn";

/**
 * Always-visible environment indicator (spec §7). Production uses an Ink surface with a
 * Coral indicator and explicit text so it is never mistaken for a safe environment.
 */
export function EnvironmentBadge({
  environment,
  className,
}: {
  environment: Environment;
  className?: string;
}) {
  const production = environment === "PRODUCTION";
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-control border px-2 font-mono text-[11px] font-medium tracking-wide",
        production
          ? "border-ink bg-ink text-canvas"
          : "border-border-strong bg-surface text-fg-secondary",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full", production ? "bg-coral" : "bg-fg-muted")}
      />
      <span className="sr-only">Environment: </span>
      {environment}
    </span>
  );
}
