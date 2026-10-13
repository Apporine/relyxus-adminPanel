import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Small single-series trend for metric cards: 2 px Violet line, current value marked
 * with an end dot. The card's title names the series, so there is no legend.
 */
export function Sparkline({
  values,
  label,
  color = "var(--ap-chart-primary)",
}: {
  values: number[];
  label: string;
  color?: string;
}) {
  const width = 120;
  const height = 32;
  const pad = 4;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const x = (i: number) => pad + (i / Math.max(1, values.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / Math.max(1, max - min)) * (height - pad * 2);
  const path = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const last = values.length - 1;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={x(last)}
        cy={y(values[last] ?? 0)}
        r={4}
        fill={color}
        stroke="var(--ap-surface)"
        strokeWidth={2}
      />
    </svg>
  );
}

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Part-to-whole bar with 2 px surface gaps between segments. Identity is carried by the
 * legend the caller renders beside it; the bar itself is hidden from assistive tech.
 */
export function SegmentedBar({ segments, className }: { segments: Segment[]; className?: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-sunken",
        className,
      )}
    >
      {total === 0
        ? null
        : segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <span
                key={s.key}
                className="h-full first:rounded-s-full last:rounded-e-full"
                style={{ flexGrow: s.value, background: s.color }}
              />
            ))}
    </div>
  );
}

export interface BarListItem {
  key: string;
  label: React.ReactNode;
  value: number;
  /** Text shown at the bar tip. */
  valueLabel: string;
  href: string;
  /** Marks the bar as risk (Coral). */
  risk?: boolean;
  note?: React.ReactNode;
  accessibleLabel: string;
}

/**
 * Horizontal bars with the value at the tip. Each row is a link to the records behind
 * it, so the row is the hit target and keyboard stop.
 */
export function BarList({ items, max }: { items: BarListItem[]; max?: number }) {
  const ceiling = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.key}>
          <Link
            href={item.href}
            aria-label={item.accessibleLabel}
            className="flex flex-col gap-1 rounded-control px-2 py-2 hover:bg-surface-hover"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-dense font-medium text-fg">{item.label}</span>
              {item.note ? (
                <span className="truncate text-micro text-fg-muted">{item.note}</span>
              ) : null}
            </span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3 rounded-e-[4px]"
                style={{
                  width: `${Math.max(2, (item.value / ceiling) * 75)}%`,
                  background: item.risk ? "var(--ap-chart-risk)" : "var(--ap-chart-primary)",
                }}
              />
              <span className="shrink-0 text-micro font-medium text-fg-secondary tabular">
                {item.valueLabel}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
