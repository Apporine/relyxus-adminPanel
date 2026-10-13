"use client";

import { useState } from "react";
import { ChartTooltip, niceTicks, useElementWidth } from "./chart-parts";

export interface StackSegment {
  key: string;
  label: string;
  color: string;
}

const HEIGHT = 168;
const MARGIN = { top: 8, right: 8, bottom: 24, left: 28 };
const GAP = 2;
const MAX_BAR = 24;
const RADIUS = 4;

/** Rect path with only the top corners rounded (the data end); square at the baseline. */
function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`;
}

/**
 * Stacked columns, one per period. Each column is its own hit target and keyboard stop
 * with a tooltip listing every segment.
 */
export function StackedColumns({
  label,
  periods,
  segments,
  values,
}: {
  label: string;
  periods: string[];
  segments: StackSegment[];
  /** values[period][segment] */
  values: number[][];
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);

  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const totals = values.map((column) => column.reduce((a, b) => a + b, 0));
  const ticks = niceTicks(Math.max(...totals, 0), 2);
  const yMax = ticks.at(-1) ?? 1;
  const band = plotWidth / periods.length;
  const barWidth = Math.min(MAX_BAR, band * 0.5);
  const scale = (v: number) => (v / yMax) * plotHeight;

  return (
    <div ref={ref} className="relative">
      <svg width={width} height={HEIGHT} role="group" aria-label={label} className="block">
        {ticks.map((tick) => {
          const ty = MARGIN.top + plotHeight - scale(tick);
          return (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={ty}
                y2={ty}
                stroke="var(--ap-chart-grid)"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 6}
                y={ty}
                dy="0.32em"
                textAnchor="end"
                className="fill-fg-muted text-[11px] tabular"
              >
                {tick}
              </text>
            </g>
          );
        })}
        {periods.map((period, p) => {
          const cx = MARGIN.left + band * p + band / 2;
          const column = values[p] ?? [];
          const nonZero = column.map((v, s) => ({ v, s })).filter(({ v }) => v > 0);
          let cursor = MARGIN.top + plotHeight;
          return (
            <g
              key={period}
              tabIndex={0}
              role="img"
              aria-label={`${period}: ${segments.map((seg, s) => `${column[s] ?? 0} ${seg.label}`).join(", ")}`}
              onPointerEnter={() => setActive(p)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => {
                setActive(p);
                setFocused(true);
              }}
              onBlur={() => {
                setActive(null);
                setFocused(false);
              }}
              className="outline-none"
            >
              <rect
                x={cx - band / 2}
                y={MARGIN.top}
                width={band}
                height={plotHeight}
                fill="transparent"
              />
              {active === p ? (
                <rect
                  x={cx - barWidth / 2 - 5}
                  y={MARGIN.top}
                  width={barWidth + 10}
                  height={plotHeight + 1}
                  rx={4}
                  fill="var(--ap-surface-sunken)"
                  stroke={focused ? "var(--ap-ink)" : "none"}
                  strokeWidth={2}
                />
              ) : null}
              <g className="chart-grow-y" style={{ ["--ap-delay" as string]: `${p * 50}ms` }}>
                {nonZero.map(({ v, s }, index) => {
                  const isTop = index === nonZero.length - 1;
                  const h = Math.max(0, scale(v) - (isTop ? 0 : GAP));
                  cursor -= scale(v);
                  const segY = cursor + (isTop ? 0 : GAP);
                  const color = segments[s]?.color ?? "var(--ap-chart-neutral)";
                  return isTop ? (
                    <path
                      key={s}
                      d={topRoundedRect(cx - barWidth / 2, segY, barWidth, h, RADIUS)}
                      fill={color}
                    />
                  ) : (
                    <rect
                      key={s}
                      x={cx - barWidth / 2}
                      y={segY}
                      width={barWidth}
                      height={h}
                      fill={color}
                    />
                  );
                })}
              </g>
              <text x={cx} y={HEIGHT - 6} textAnchor="middle" className="fill-fg-muted text-[11px]">
                {period}
              </text>
            </g>
          );
        })}
      </svg>
      {active !== null ? (
        <ChartTooltip
          title={periods[active] ?? ""}
          x={MARGIN.left + band * active + band / 2}
          containerWidth={width}
          rows={segments
            .map((seg, s) => ({
              label: seg.label,
              value: String(values[active]?.[s] ?? 0),
              color: seg.color,
              shape: "block" as const,
            }))
            .reverse()}
        />
      ) : null}
    </div>
  );
}
