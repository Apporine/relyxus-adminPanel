import type { HealthFactor } from "./health";
import type { CaseSeverity, Customer, HealthOverride, OnboardingItem, SupportCase } from "./types";

const MINUTE_MS = 60_000;

/** Support entitlement by tier (spec §20): channels, hours, response objectives, path. */
export const supportPolicy: Record<
  Customer["supportTier"],
  {
    label: string;
    channels: string[];
    hours: string;
    /** First response objective in minutes, by severity. */
    responseMinutes: Record<CaseSeverity, number>;
    escalationPath: string[];
  }
> = {
  standard: {
    label: "Standard",
    channels: ["Portal", "Email"],
    hours: "Business hours, Monday to Friday",
    responseMinutes: { sev1: 240, sev2: 480, sev3: 1440, sev4: 2880 },
    escalationPath: ["Support engineer", "Support lead"],
  },
  premium: {
    label: "Premium",
    channels: ["Portal", "Email", "Phone"],
    hours: "Extended hours, 07:00 to 22:00 local",
    responseMinutes: { sev1: 60, sev2: 240, sev3: 480, sev4: 1440 },
    escalationPath: ["Support engineer", "Support lead", "Head of Customer Operations"],
  },
  mission_critical: {
    label: "Mission critical",
    channels: ["Portal", "Email", "Phone", "Shared channel"],
    hours: "24 x 7",
    responseMinutes: { sev1: 15, sev2: 60, sev3: 240, sev4: 960 },
    escalationPath: [
      "Support engineer",
      "Principal engineer",
      "Head of Customer Operations",
      "Executive sponsor",
    ],
  },
};

export const severities: CaseSeverity[] = ["sev1", "sev2", "sev3", "sev4"];

export function firstResponseMinutes(c: SupportCase): number | undefined {
  if (!c.firstResponseAt) return undefined;
  return Math.round((Date.parse(c.firstResponseAt) - Date.parse(c.openedAt)) / MINUTE_MS);
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}

export interface SlaRow {
  severity: CaseSeverity;
  total: number;
  open: number;
  breached: number;
  atRisk: number;
  /** Share of cases that met their SLA, 0 to 1; undefined when there are none. */
  compliance?: number;
  medianFirstResponseMinutes?: number;
}

/** SLA report by severity (spec §20, §26). */
export function slaReport(cases: SupportCase[]): SlaRow[] {
  return severities.map((severity) => {
    const rows = cases.filter((c) => c.severity === severity);
    const breached = rows.filter((c) => c.slaState === "breached").length;
    return {
      severity,
      total: rows.length,
      open: rows.filter((c) => c.status !== "resolved").length,
      breached,
      atRisk: rows.filter((c) => c.slaState === "at_risk").length,
      compliance: rows.length ? (rows.length - breached) / rows.length : undefined,
      medianFirstResponseMinutes: median(
        rows.map(firstResponseMinutes).filter((m): m is number => m !== undefined),
      ),
    };
  });
}

export interface RecurringIssue {
  title: string;
  productId?: string;
  releases: string[];
  customerIds: string[];
  caseIds: string[];
}

/**
 * Recurring issue view (spec §20): cases grouped by product and issue title across
 * customers and releases. Only titles and references are used, never case content.
 */
export function recurringIssues(cases: SupportCase[]): RecurringIssue[] {
  const groups = new Map<string, SupportCase[]>();
  for (const c of cases) {
    const key = `${c.productId ?? ""}|${c.title.trim().toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      title: group[0]!.title,
      productId: group[0]!.productId,
      releases: [...new Set(group.map((c) => c.releaseVersion))].sort(),
      customerIds: [...new Set(group.map((c) => c.customerId))],
      caseIds: group.map((c) => c.id),
    }))
    .sort((a, b) => b.caseIds.length - a.caseIds.length);
}

export interface OnboardingProgress {
  customerId: string;
  done: number;
  total: number;
  overdue: OnboardingItem[];
  blocked: OnboardingItem[];
  next?: OnboardingItem;
}

/** Checklist progress for one customer (spec §11); blocked items name their dependency. */
export function onboardingProgress(
  customerId: string,
  items: OnboardingItem[],
  now: string,
): OnboardingProgress {
  const mine = items.filter((i) => i.customerId === customerId);
  const open = mine.filter((i) => i.status !== "done");
  return {
    customerId,
    done: mine.length - open.length,
    total: mine.length,
    overdue: open.filter((i) => Date.parse(i.dueAt) < Date.parse(now)),
    blocked: open.filter((i) => i.status === "blocked"),
    next: [...open].sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0],
  };
}

export interface FactorWithOverride extends HealthFactor {
  override?: HealthOverride;
}

/**
 * Applies unexpired operator overrides. The calculated status stays on the factor; the
 * override is shown beside it, never instead of it (spec §19).
 */
export function withOverrides(
  customerId: string,
  factors: HealthFactor[],
  overrides: HealthOverride[],
  now: string,
): FactorWithOverride[] {
  return factors.map((factor) => {
    const override = overrides.find(
      (o) =>
        o.customerId === customerId &&
        o.factor === factor.key &&
        Date.parse(o.expiresAt) > Date.parse(now),
    );
    return override ? { ...factor, override } : factor;
  });
}

/** "45 min", "4 h", "1 d 6 h" for response times. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.round((minutes % 1440) / 60);
  return hours ? `${days} d ${hours} h` : `${days} d`;
}
