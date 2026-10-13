"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Tracks an element's content width so SVG charts draw at true pixel size. */
export function useElementWidth<T extends HTMLElement>(fallback = 480) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(160, Math.floor(entry.contentRect.width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

export interface TooltipRow {
  label: string;
  value: string;
  /** CSS color of the series key. */
  color: string;
  /** Key shape mirrors the mark: a line for lines, a block for bars. */
  shape?: "line" | "block";
}

/**
 * Chart tooltip: the value leads and the series name follows, keyed by a short stroke of
 * the series color. Text always uses text tokens, never the series color.
 */
export function ChartTooltip({
  title,
  rows,
  x,
  containerWidth,
}: {
  title: string;
  rows: TooltipRow[];
  x: number;
  containerWidth: number;
}) {
  const flip = x > containerWidth - 180;
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-1 z-(--z-sticky) min-w-36 rounded-control border border-border bg-surface px-3 py-2 shadow-overlay"
      style={flip ? { right: containerWidth - x + 12 } : { left: x + 12 }}
    >
      <p className="text-micro text-fg-muted">{title}</p>
      <ul className="mt-1 flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 text-dense">
            <span
              aria-hidden="true"
              className={cn(
                "shrink-0",
                row.shape === "block" ? "size-2.5 rounded-[2px]" : "h-0.5 w-3 rounded-full",
              )}
              style={{ background: row.color }}
            />
            <span className="font-semibold text-fg tabular">{row.value}</span>
            <span className="text-fg-muted">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Rounded ceiling for an axis maximum, with four even ticks. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}
