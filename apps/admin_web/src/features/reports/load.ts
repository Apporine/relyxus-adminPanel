import "server-only";

import { fieldPermissions, restrictDataset } from "@/domain/reports";
import type { DatasetKey } from "@/domain/types";
import {
  getCurrentStaff,
  getReferenceTime,
  getStaffDirectory,
  listReportSchedules,
  listReports,
  listSavedViews,
} from "@/server/data";
import { loadDatasets } from "./datasets";

/**
 * Reports, views and schedules, with every dataset already restricted to the fields the
 * current staff member may see (spec §26: row and field level permissions).
 */
export async function loadReports() {
  const [now, me, directory, reports, views, schedules, raw] = await Promise.all([
    getReferenceTime(),
    getCurrentStaff(),
    getStaffDirectory(),
    listReports(),
    listSavedViews(),
    listReportSchedules(),
    loadDatasets(),
  ]);
  const granted = fieldPermissions(me.roles);
  const datasets = Object.fromEntries(
    Object.entries(raw).map(([key, dataset]) => [key, restrictDataset(dataset, granted)]),
  ) as Record<DatasetKey, ReturnType<typeof restrictDataset>>;

  return {
    now,
    me,
    staffName: (id: string) => directory[id]?.name ?? id,
    reports,
    reportById: Object.fromEntries(reports.map((r) => [r.id, r])),
    views,
    schedules,
    datasets,
  };
}

export type ReportsData = Awaited<ReturnType<typeof loadReports>>;
