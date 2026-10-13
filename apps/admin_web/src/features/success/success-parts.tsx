import { SegmentNav } from "@/components/ui/segment-nav";

export type SuccessView = "health" | "risks" | "onboarding" | "qbrs" | "support" | "sla";

const items: { id: SuccessView; href: string; label: string }[] = [
  { id: "health", href: "/success", label: "Health overview" },
  { id: "risks", href: "/success/risks", label: "Risk register" },
  { id: "onboarding", href: "/success/onboarding", label: "Onboarding" },
  { id: "qbrs", href: "/success/qbrs", label: "QBRs" },
  { id: "support", href: "/success/support", label: "Support" },
  { id: "sla", href: "/success/support/sla", label: "SLA report" },
];

export function SuccessNav({ current }: { current: SuccessView }) {
  return (
    <SegmentNav
      label="Success views"
      items={items.map((i) => ({ href: i.href, label: i.label, current: i.id === current }))}
    />
  );
}

/** Score bar: the number is always printed; the bar only aids scanning. */
export function ScoreBar({ score }: { score: number }) {
  const tone =
    score >= 75 ? "bg-chart-healthy" : score >= 55 ? "bg-chart-primary" : "bg-chart-critical";
  return (
    <span className="flex items-center gap-2">
      <span className="w-8 text-end font-semibold text-fg tabular">{score}</span>
      <span
        aria-hidden="true"
        className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-sunken"
      >
        <span
          className={`block h-full chart-grow-x rounded-full ${tone}`}
          style={{ width: `${score}%` }}
        />
      </span>
    </span>
  );
}
