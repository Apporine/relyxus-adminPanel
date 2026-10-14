import { cn } from "@/lib/cn";
import { Skeleton } from "./feedback";

/**
 * Loading skeletons that mirror the real screen structure, so a route change shows the
 * shape of the next screen at once instead of a blank pause. Shimmer stops under
 * prefers-reduced-motion like every other animation.
 */

/** Varied widths so rows read as text, not stripes. */
const widths = ["w-3/4", "w-1/2", "w-2/3", "w-5/6", "w-2/5", "w-3/5"];

function Frame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-card border border-border bg-surface shadow-card", className)}
    >
      {children}
    </div>
  );
}

function CardTitleLines() {
  return (
    <div className="flex flex-col gap-2 px-4 pt-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-64 max-w-full" />
    </div>
  );
}

export function SkeletonPageHeader({
  title,
  description = true,
  actions = 0,
  breadcrumbs = false,
}: {
  /** The screen's real title, shown at once so only the data shimmers. */
  title?: string;
  description?: boolean;
  actions?: number;
  breadcrumbs?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {breadcrumbs ? <Skeleton aria-hidden="true" className="h-3.5 w-56" /> : null}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-2">
          {title ? (
            <p className="text-page-title text-fg">{title}</p>
          ) : (
            <Skeleton aria-hidden="true" className="h-8 w-72" />
          )}
          {description ? (
            <Skeleton aria-hidden="true" className="h-4 w-[28rem] max-w-full" />
          ) : null}
        </div>
        {actions ? (
          <div aria-hidden="true" className="flex gap-2">
            {Array.from({ length: actions }, (_, i) => (
              <Skeleton key={i} className="h-9 w-28" />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SkeletonSegmentNav({ items = 4 }: { items?: number }) {
  return (
    <div
      aria-hidden="true"
      className="flex w-fit max-w-full gap-1 overflow-hidden rounded-card border border-border bg-surface/70 p-1 shadow-card"
    >
      {Array.from({ length: items }, (_, i) => (
        <Skeleton key={i} className={cn("h-8 rounded-control", i === 0 ? "w-28" : "w-24")} />
      ))}
    </div>
  );
}

export function SkeletonFilterBar({ fields = 5 }: { fields?: number }) {
  return (
    <div
      aria-hidden="true"
      className="-mx-4 flex flex-wrap items-end gap-3 border-b border-border px-4 py-3 md:-mx-8 md:px-8"
    >
      <div className="flex w-64 flex-col gap-1">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-8 w-full" />
      </div>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex w-36 flex-col gap-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonMetricCards({ count = 4 }: { count?: number }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid grid-cols-2 gap-4",
        count >= 6
          ? "lg:grid-cols-3 2xl:grid-cols-6"
          : count === 3
            ? "sm:grid-cols-3"
            : "xl:grid-cols-4",
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <Frame key={i} className="flex min-h-32 flex-col gap-2 p-4">
          <div className="flex items-start justify-between">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-32" />
          <div className="mt-auto flex justify-between pt-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </Frame>
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 8,
  columns = 6,
  title = false,
}: {
  rows?: number;
  columns?: number;
  title?: boolean;
}) {
  return (
    <Frame className="overflow-hidden">
      {title ? <CardTitleLines /> : null}
      <div
        className="mt-3 grid gap-x-6 border-b border-border px-4 pb-2.5"
        style={{ gridTemplateColumns: `2fr repeat(${columns - 1}, 1fr)` }}
      >
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 w-16" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="grid items-center gap-x-6 border-b border-border px-4 py-3 last:border-b-0"
          style={{ gridTemplateColumns: `2fr repeat(${columns - 1}, 1fr)` }}
        >
          <div className="flex flex-col gap-1.5">
            <Skeleton className={cn("h-3.5", widths[r % widths.length])} />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          {Array.from({ length: columns - 1 }, (_, c) => (
            <Skeleton key={c} className={cn("h-3", widths[(r + c + 1) % widths.length])} />
          ))}
        </div>
      ))}
    </Frame>
  );
}

export function SkeletonChart({ height = "h-48" }: { height?: string }) {
  const bars = [55, 70, 48, 82, 64, 90, 58, 74, 40, 86, 68, 77];
  return (
    <Frame className="flex flex-col">
      <CardTitleLines />
      <div className={cn("mx-4 mt-4 mb-4 flex items-end gap-2", height)}>
        {bars.map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-[4px] rounded-b-none"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </Frame>
  );
}

export function SkeletonCard({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <Frame className={cn("flex flex-col pb-4", className)}>
      <CardTitleLines />
      <div className="mt-4 flex flex-col gap-3 px-4">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <Skeleton className={cn("h-3.5", widths[i % widths.length])} />
            <Skeleton className="h-3.5 w-14" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** Announces the load once to assistive tech; the visual skeleton is decorative. */
function Screen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Loading {label}</span>
      {children}
    </div>
  );
}

// Screen compositions ---------------------------------------------------------------------

/** List screens: optional view nav, filters, metric cards and a dense table. */
export function ListScreenSkeleton({
  title,
  label = title ?? "screen",
  nav,
  filters,
  metrics,
  columns = 6,
  rows = 8,
  actions = 1,
}: {
  title?: string;
  label?: string;
  nav?: number;
  filters?: number;
  metrics?: number;
  columns?: number;
  rows?: number;
  actions?: number;
}) {
  return (
    <Screen label={label}>
      <SkeletonPageHeader title={title} actions={actions} />
      {nav ? <SkeletonSegmentNav items={nav} /> : null}
      {filters ? <SkeletonFilterBar fields={filters} /> : null}
      {metrics ? <SkeletonMetricCards count={metrics} /> : null}
      <SkeletonTable rows={rows} columns={columns} />
    </Screen>
  );
}

/** Dashboards: metric cards, a chart row and a table or lists. */
export function DashboardScreenSkeleton({
  title,
  label = title ?? "dashboard",
  nav,
  filters,
  metrics = 4,
  charts = 2,
  table = true,
}: {
  title?: string;
  label?: string;
  nav?: number;
  filters?: number;
  metrics?: number;
  charts?: number;
  table?: boolean;
}) {
  return (
    <Screen label={label}>
      <SkeletonPageHeader title={title} actions={1} />
      {nav ? <SkeletonSegmentNav items={nav} /> : null}
      {filters ? <SkeletonFilterBar fields={filters} /> : null}
      {metrics ? <SkeletonMetricCards count={metrics} /> : null}
      {charts ? (
        <div className={cn("grid gap-4", charts > 1 && "xl:grid-cols-[3fr_2fr]")}>
          {Array.from({ length: charts }, (_, i) => (
            <SkeletonChart key={i} />
          ))}
        </div>
      ) : null}
      {table ? <SkeletonTable rows={6} columns={5} title /> : null}
    </Screen>
  );
}

/** Detail screens: breadcrumbs, header with status, tabs, main cards and a right rail. */
export function DetailScreenSkeleton({
  label,
  tabs = 0,
  rail = true,
  metrics = 0,
}: {
  label: string;
  tabs?: number;
  rail?: boolean;
  metrics?: number;
}) {
  return (
    <Screen label={label}>
      <SkeletonPageHeader breadcrumbs actions={2} />
      <div aria-hidden="true" className="flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      {metrics ? <SkeletonMetricCards count={metrics} /> : null}
      {tabs ? <SkeletonSegmentNav items={tabs} /> : null}
      <div className={cn("grid gap-4", rail && "xl:grid-cols-[minmax(0,1fr)_22rem]")}>
        <div className="flex min-w-0 flex-col gap-4">
          <SkeletonCard lines={5} />
          <SkeletonTable rows={5} columns={5} title />
        </div>
        {rail ? (
          <div className="flex flex-col gap-4">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} />
          </div>
        ) : null}
      </div>
    </Screen>
  );
}

/** Boards with columns of cards, such as onboarding. */
export function BoardScreenSkeleton({
  title,
  label = title ?? "board",
  nav,
  columns = 5,
}: {
  title?: string;
  label?: string;
  nav?: number;
  columns?: number;
}) {
  return (
    <Screen label={label}>
      <SkeletonPageHeader title={title} />
      {nav ? <SkeletonSegmentNav items={nav} /> : null}
      <div
        aria-hidden="true"
        className="grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-hidden"
      >
        {Array.from({ length: columns }, (_, c) => (
          <div
            key={c}
            className="flex flex-col gap-2 rounded-card border border-border bg-surface-sunken/60 p-3"
          >
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 2 + (c % 2) }, (_, i) => (
              <Frame key={i} className="flex flex-col gap-2 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </Frame>
            ))}
          </div>
        ))}
      </div>
    </Screen>
  );
}

/** Card grids such as settings sections, the report library and environments. */
export function CardsScreenSkeleton({
  title,
  label = title ?? "screen",
  nav,
  cards = 3,
  columns = 3,
}: {
  title?: string;
  label?: string;
  nav?: number;
  cards?: number;
  columns?: 1 | 2 | 3;
}) {
  return (
    <Screen label={label}>
      <SkeletonPageHeader title={title} />
      {nav ? <SkeletonSegmentNav items={nav} /> : null}
      <div
        className={cn(
          "grid gap-4",
          columns === 3 && "lg:grid-cols-2 xl:grid-cols-3",
          columns === 2 && "xl:grid-cols-2",
        )}
      >
        {Array.from({ length: cards }, (_, i) => (
          <SkeletonCard key={i} lines={3 + (i % 3)} />
        ))}
      </div>
    </Screen>
  );
}

/** Form or flow screens: a step header and a form card with a summary beside it. */
export function FormScreenSkeleton({ label }: { label: string }) {
  return (
    <Screen label={label}>
      <SkeletonPageHeader breadcrumbs />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Frame className="flex flex-col gap-5 p-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className={cn("w-full", i === 3 ? "h-24" : "h-9")} />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-36" />
          </div>
        </Frame>
        <SkeletonCard lines={5} />
      </div>
    </Screen>
  );
}

/**
 * In-page fallback below a screen's real header and navigation: the data region only.
 * Used by Suspense boundaries inside pages, after the route's static shell has rendered.
 */
export function ContentSkeleton({
  label,
  metrics = 0,
  charts = 0,
  table = true,
  cards = 0,
  columns = 6,
}: {
  label: string;
  metrics?: number;
  charts?: number;
  table?: boolean;
  cards?: number;
  columns?: number;
}) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Loading {label}</span>
      {metrics ? <SkeletonMetricCards count={metrics} /> : null}
      {charts ? (
        <div className={cn("grid gap-4", charts > 1 && "xl:grid-cols-[3fr_2fr]")}>
          {Array.from({ length: charts }, (_, i) => (
            <SkeletonChart key={i} />
          ))}
        </div>
      ) : null}
      {cards ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: cards }, (_, i) => (
            <SkeletonCard key={i} lines={3 + (i % 2)} />
          ))}
        </div>
      ) : null}
      {table ? <SkeletonTable rows={8} columns={columns} /> : null}
    </div>
  );
}
