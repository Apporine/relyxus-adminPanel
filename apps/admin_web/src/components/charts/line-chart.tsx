"use client";

import { useState } from "react";
import { formatMoneyCompact, formatNumber } from "@/lib/format";
import { ChartTooltip, niceTicks, useElementWidth } from "./chart-parts";

/** Value formats are named, not passed as functions, so server components can render the chart. */
export type ValueFormat = "number" | "gbp";

const formatters: Record<ValueFormat, (value: number) => string> = {
  number: formatNumber,
  gbp: (value) => formatMoneyCompact({ amountMinor: Math.round(value * 100), currency: "GBP" }),
};

export interface LineSeries {
  key: string;
  label: string;
  /** CSS color, normally a chart token such as var(--ap-chart-primary). */
  color: string;
  values: number[];
}

const HEIGHT = 184;
const MARGIN = { top: 12, bottom: 24, left: 44 };
const LABEL_SPACING = 44;

/**
 * Line chart with a crosshair that snaps to the nearest X and one tooltip listing every
 * series (dataviz interaction spec). Arrow keys move the crosshair when focused.
 */
export function LineChart({
  label,
  xLabels,
  series,
  format,
}: {
  label: string;
  xLabels: string[];
  series: LineSeries[];
  format: ValueFormat;
}) {
  const formatValue = formatters[format];
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  // Room on the right for direct end labels, sized to the longest series name.
  const right = 20 + Math.max(...series.map((s) => s.label.length), 4) * 6.5;
  const plotWidth = width - MARGIN.left - right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const ticks = niceTicks(Math.max(...series.flatMap((s) => s.values), 0));
  const yMax = ticks.at(-1) ?? 1;
  const count = xLabels.length;
  const labelStep = Math.max(
    1,
    Math.ceil(count / Math.max(1, Math.floor(plotWidth / LABEL_SPACING))),
  );
  const x = (i: number) =>
    MARGIN.left + (count <= 1 ? plotWidth / 2 : (i / (count - 1)) * plotWidth);
  const y = (v: number) => MARGIN.top + plotHeight - (v / yMax) * plotHeight;

  function indexFromPointer(clientX: number, rect: DOMRect) {
    const ratio = (clientX - rect.left - MARGIN.left) / plotWidth;
    return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    setActive((current) => Math.min(count - 1, Math.max(0, (current ?? count - 1) + step)));
  }

  return (
    <div ref={ref} className="relative">
      <svg
        width={width}
        height={HEIGHT}
        role="group"
        aria-label={`${label}. Use left and right arrow keys to read values.`}
        tabIndex={0}
        className="block touch-pan-y rounded-control"
        onPointerMove={(event) =>
          setActive(indexFromPointer(event.clientX, event.currentTarget.getBoundingClientRect()))
        }
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(count - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + plotWidth}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--ap-chart-grid)"
              strokeWidth={1}
            />
            <text
              x={MARGIN.left - 8}
              y={y(tick)}
              dy="0.32em"
              textAnchor="end"
              className="fill-fg-muted text-[11px] tabular"
            >
              {formatValue(tick)}
            </text>
          </g>
        ))}
        {xLabels.map((xLabel, i) =>
          // Thin labels to fit, anchored on the latest point so it is always labelled.
          (count - 1 - i) % labelStep !== 0 ? null : (
            <text
              key={xLabel}
              x={x(i)}
              y={HEIGHT - 6}
              textAnchor="middle"
              className="fill-fg-muted text-[11px]"
            >
              {xLabel}
            </text>
          ),
        )}

        {active !== null ? (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={MARGIN.top}
            y2={MARGIN.top + plotHeight}
            stroke="var(--ap-fg-muted)"
            strokeWidth={1}
          />
        ) : null}

        {series.map((s) => {
          const path = s.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
          const last = s.values.length - 1;
          const lastValue = s.values[last] ?? 0;
          const dotIndex = active ?? last;
          const dotValue = s.values[dotIndex] ?? 0;
          return (
            <g key={s.key}>
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle
                cx={x(dotIndex)}
                cy={y(dotValue)}
                r={4}
                fill={s.color}
                stroke="var(--ap-surface)"
                strokeWidth={2}
              />
              <text
                x={x(last) + 10}
                y={y(lastValue)}
                dy="0.32em"
                className="fill-fg-secondary text-[11px] font-medium"
              >
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
      {active !== null ? (
        <ChartTooltip
          title={xLabels[active] ?? ""}
          x={x(active)}
          containerWidth={width}
          rows={series.map((s) => ({
            label: s.label,
            value: formatValue(s.values[active] ?? 0),
            color: s.color,
          }))}
        />
      ) : null}
    </div>
  );
}
