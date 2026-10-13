import type { Contract, RenewalStage } from "./types";

const DAY_MS = 86_400_000;

export const RADAR_WINDOWS = [30, 60, 90, 120] as const;
export type RadarWindow = (typeof RADAR_WINDOWS)[number];

/** Renewal stages in order; Renewed and Lost are both final (spec §30.1). */
export const renewalStages: RenewalStage[] = [
  "not_started",
  "discovery",
  "proposal",
  "negotiation",
  "committed",
  "renewed",
  "lost",
];

export function daysToEnd(contract: Contract, now: string): number {
  return Math.ceil((Date.parse(contract.endsAt) - Date.parse(now)) / DAY_MS);
}

/** Last day to give notice under the contract. */
export function noticeDeadline(contract: Contract): string {
  return new Date(Date.parse(contract.endsAt) - contract.noticeDays * DAY_MS).toISOString();
}

export function noticePassed(contract: Contract, now: string): boolean {
  return Date.parse(noticeDeadline(contract)) <= Date.parse(now);
}

/** The radar window a contract falls in, or undefined when outside 120 days or ended. */
export function radarWindow(contract: Contract, now: string): RadarWindow | undefined {
  const days = daysToEnd(contract, now);
  if (days < 0) return undefined;
  return RADAR_WINDOWS.find((w) => days <= w);
}

export function isOpenRenewal(contract: Contract): boolean {
  return contract.renewalStage !== "renewed" && contract.renewalStage !== "lost";
}

/** Next action for a renewal, from its stage and notice deadline. */
export function nextRenewalAction(contract: Contract, now: string): string {
  if (contract.renewalStage === "not_started") {
    return noticePassed(contract, now)
      ? "Notice deadline passed: confirm renewal terms now"
      : "Start the renewal plan";
  }
  switch (contract.renewalStage) {
    case "discovery":
      return "Confirm scope and entitlement changes";
    case "proposal":
      return "Send the renewal proposal";
    case "negotiation":
      return "Agree final terms";
    case "committed":
      return "Collect the signed order form";
    default:
      return "No action";
  }
}

/** Parses the ?renewal= filter: only the four radar windows are accepted. */
export function parseRadarWindow(value: string | string[] | undefined): RadarWindow | undefined {
  const raw = Number(Array.isArray(value) ? value[0] : value);
  return RADAR_WINDOWS.find((w) => w === raw);
}
