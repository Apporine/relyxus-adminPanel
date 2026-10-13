import { CircleCheck, CircleSlash, TriangleAlert } from "lucide-react";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { SegmentNav } from "@/components/ui/segment-nav";
import {
  deploymentRiskLabel,
  readinessLabel,
  type DeploymentRisk,
  type Readiness,
} from "@/domain/fleet";
import { releaseStatus } from "@/domain/status";
import type { Release } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

export type DeploymentsView = "fleet" | "heatmap" | "readiness";

export function DeploymentsNav({ current }: { current: DeploymentsView }) {
  return (
    <SegmentNav
      label="Deployment views"
      items={[
        { href: "/deployments", label: "Fleet", current: current === "fleet" },
        { href: "/deployments/heatmap", label: "Release heatmap", current: current === "heatmap" },
        {
          href: "/deployments/readiness",
          label: "Upgrade readiness",
          current: current === "readiness",
        },
      ]}
    />
  );
}

export function ReleasesNav({ current }: { current: "list" | "compatibility" }) {
  return (
    <SegmentNav
      label="Release views"
      items={[
        { href: "/releases", label: "Releases", current: current === "list" },
        {
          href: "/releases/compatibility",
          label: "Compatibility matrix",
          current: current === "compatibility",
        },
      ]}
    />
  );
}

export function ReleaseStatusBadge({ release }: { release: Release }) {
  const p = releaseStatus[release.status];
  return <StatusBadge tone={p.tone} label={p.label} />;
}

export function RiskTags({ risks }: { risks: DeploymentRisk[] }) {
  if (risks.length === 0) return <span className="text-micro text-fg-muted">None</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {risks.map((r) => (
        <Tag key={r} className="bg-coral-subtle text-coral-text">
          {deploymentRiskLabel[r]}
        </Tag>
      ))}
    </span>
  );
}

const readinessTone = {
  current: "healthy",
  compatible: "healthy",
  review_needed: "neutral",
  blocked: "critical",
} as const;

const readinessIcon = {
  current: CircleCheck,
  compatible: CircleCheck,
  review_needed: TriangleAlert,
  blocked: CircleSlash,
};

export function ReadinessBadge({ readiness }: { readiness: Readiness }) {
  return (
    <StatusBadge
      tone={readinessTone[readiness]}
      icon={readinessIcon[readiness]}
      label={readinessLabel[readiness]}
    />
  );
}

/**
 * Release support timeline: release date to end of support with a marker for today. The
 * dates are written out; the bar only shows where in the window the deployment sits.
 */
export function SupportTimeline({ release, now }: { release: Release; now: string }) {
  if (!release.releasedAt || !release.endOfSupportAt) {
    return <p className="text-dense text-fg-muted">No support window recorded.</p>;
  }
  const start = Date.parse(release.releasedAt);
  const end = Date.parse(release.endOfSupportAt);
  const at = Math.min(1, Math.max(0, (Date.parse(now) - start) / (end - start)));
  const ended = at >= 1;
  return (
    <div>
      <div className="relative h-2 rounded-full bg-surface-sunken" aria-hidden="true">
        <div
          className={cn(
            "h-full chart-grow-x rounded-full",
            ended
              ? "bg-chart-critical"
              : at > 0.75
                ? "bg-linear-to-r from-violet to-coral"
                : "bg-linear-to-r from-violet to-chart-primary-2",
          )}
          style={{ width: `${Math.round(at * 100)}%` }}
        />
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink shadow-card"
          style={{ left: `${Math.round(at * 100)}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-micro text-fg-muted">
        <span>Released {formatDate(release.releasedAt)}</span>
        <span className={cn(ended && "font-semibold text-coral-text")}>
          {ended ? "Support ended" : "End of support"} {formatDate(release.endOfSupportAt)}
        </span>
      </div>
    </div>
  );
}
