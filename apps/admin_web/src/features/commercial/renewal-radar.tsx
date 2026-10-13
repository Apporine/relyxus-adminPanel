import { CalendarClock, CircleAlert } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/feedback";
import { sumByCurrency } from "@/domain/money";
import {
  daysToEnd,
  isOpenRenewal,
  nextRenewalAction,
  noticePassed,
  RADAR_WINDOWS,
  radarWindow,
} from "@/domain/renewals";
import { healthStatus, renewalStage } from "@/domain/status";
import { cn } from "@/lib/cn";
import { formatMoneyCompact, formatMoneyList, plural } from "@/lib/format";
import { loadCommercial, openRisks } from "./load";

const laneLabel = {
  30: "Within 30 days",
  60: "31 to 60 days",
  90: "61 to 90 days",
  120: "91 to 120 days",
};

/**
 * Renewal radar (spec §19): 30, 60, 90 and 120 day windows with contract value, health,
 * open risks, owner and next action, plus value at risk per window.
 */
export async function RenewalRadar() {
  const data = await loadCommercial();
  const open = data.contracts.filter((c) => isOpenRenewal(c) && radarWindow(c, data.now));
  const lanes = RADAR_WINDOWS.map((w) => {
    const items = open
      .filter((c) => radarWindow(c, data.now) === w)
      .sort((a, b) => a.endsAt.localeCompare(b.endsAt));
    const atRisk = items.filter((c) => {
      const health = data.customerById[c.customerId]?.health;
      return health === "at_risk" || health === "critical";
    });
    return {
      window: w,
      items,
      value: sumByCurrency(items.map((c) => c.annualContractValue)),
      valueAtRisk: sumByCurrency(atRisk.map((c) => c.annualContractValue)),
    };
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {lanes.map((lane) => (
        <section
          key={lane.window}
          aria-labelledby={`lane-${lane.window}`}
          className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface-sunken/60 p-3"
        >
          <header className="px-1">
            <h2 id={`lane-${lane.window}`} className="flex items-baseline justify-between gap-2">
              <span className="text-card-title text-fg">{laneLabel[lane.window]}</span>
              <span className="text-dense text-fg-muted tabular">
                {plural(lane.items.length, "contract")}
              </span>
            </h2>
            {data.canViewCommercial ? (
              <p className="mt-1 text-dense text-fg-secondary tabular">
                {lane.value.length ? formatMoneyList(lane.value) : "No value"}
                {lane.valueAtRisk.length ? (
                  <span className="block font-medium text-coral-text">
                    At risk {formatMoneyList(lane.valueAtRisk)}
                  </span>
                ) : null}
              </p>
            ) : null}
          </header>
          {lane.items.length === 0 ? (
            <p className="rounded-control border border-dashed border-border-strong px-3 py-6 text-center text-dense text-fg-muted">
              No renewals in this window
            </p>
          ) : (
            <ul className="flex stagger flex-col gap-2">
              {lane.items.map((c) => {
                const customer = data.customerById[c.customerId];
                const risks = openRisks(c.customerId, data);
                const passed = noticePassed(c, data.now);
                return (
                  <li key={c.id}>
                    <article
                      aria-labelledby={`renewal-${c.id}`}
                      className="relative rounded-card border border-border bg-surface p-3 shadow-card transition-[transform,box-shadow] duration-(--ap-duration-panel) hover:-translate-y-0.5 hover:shadow-lift"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 id={`renewal-${c.id}`} className="min-w-0 text-body font-semibold">
                          <Link
                            href={`/commercial/renewals/${c.id}`}
                            className="text-fg after:absolute after:inset-0 after:rounded-card hover:text-violet-text"
                          >
                            {customer?.displayName ?? c.customerId}
                          </Link>
                        </h3>
                        {customer ? (
                          <StatusBadge
                            tone={healthStatus[customer.health].tone}
                            label={healthStatus[customer.health].label}
                          />
                        ) : null}
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-micro text-fg-muted">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock aria-hidden="true" className="size-3.5" />
                          {daysToEnd(c, data.now)} days
                        </span>
                        <span>{renewalStage[c.renewalStage]}</span>
                        {data.canViewCommercial ? (
                          <span className="font-medium text-fg-secondary tabular">
                            {formatMoneyCompact(c.annualContractValue)}
                          </span>
                        ) : null}
                      </p>
                      <p
                        className={cn(
                          "mt-2 text-dense",
                          passed ? "font-medium text-coral-text" : "text-fg-secondary",
                        )}
                      >
                        {passed && c.renewalStage !== "not_started" ? "Notice passed. " : ""}
                        {nextRenewalAction(c, data.now)}
                      </p>
                      <p className="mt-2 flex items-center justify-between gap-2 text-micro text-fg-muted">
                        <span>{data.staff[c.renewalOwnerId]?.name ?? c.renewalOwnerId}</span>
                        {risks.length ? (
                          <span className="inline-flex items-center gap-1 font-medium text-coral-text">
                            <CircleAlert aria-hidden="true" className="size-3.5" />
                            {plural(risks.length, "open risk")}
                          </span>
                        ) : (
                          <span>No open risks</span>
                        )}
                      </p>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export function RenewalRadarSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-80 rounded-card" />
      ))}
    </div>
  );
}
