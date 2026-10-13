import "server-only";

import { postureState, securityFindings } from "@/domain/security";
import type { RoleKey } from "@/domain/types";
import {
  getCurrentStaff,
  getReferenceTime,
  getStaffDirectory,
  listAccessReviews,
  listApiClients,
  listBreakGlass,
  listLicenses,
  listReviewCompletionHistory,
  listSecuritySignals,
  listSensitiveAccess,
  listSigningKeys,
  listStaff,
  listStaffAccess,
} from "@/server/data";

/** Roles that may read who viewed or exported restricted fields (spec §23). */
const sensitiveAccessReaders: RoleKey[] = ["security_admin", "auditor"];

/** One snapshot for security screens; posture findings come from src/domain/security. */
export async function loadSecurity() {
  const [
    now,
    me,
    staff,
    directory,
    access,
    reviews,
    clients,
    keys,
    breakGlass,
    sensitive,
    signals,
    completion,
    licenses,
  ] = await Promise.all([
    getReferenceTime(),
    getCurrentStaff(),
    listStaff(),
    getStaffDirectory(),
    listStaffAccess(),
    listAccessReviews(),
    listApiClients(),
    listSigningKeys(),
    listBreakGlass(),
    listSensitiveAccess(),
    listSecuritySignals(),
    listReviewCompletionHistory(),
    listLicenses(),
  ]);

  const findings = securityFindings({
    now,
    staff,
    access,
    reviews,
    clients,
    keys,
    breakGlass,
    signals,
  });

  // Licenses whose current revision is signed by each key.
  const licensesByKey: Record<string, number> = {};
  for (const license of licenses) {
    const keyId = license.revisions.at(-1)?.signingKeyId;
    if (keyId) licensesByKey[keyId] = (licensesByKey[keyId] ?? 0) + 1;
  }

  return {
    now,
    me,
    staff,
    directory,
    accessById: Object.fromEntries(access.map((a) => [a.staffId, a])),
    reviews,
    clients,
    keys,
    breakGlass,
    sensitive,
    signals,
    completion,
    findings,
    posture: postureState(findings),
    licensesByKey,
    canViewSensitiveAccess: me.roles.some((r) => sensitiveAccessReaders.includes(r)),
  };
}

export type SecurityData = Awaited<ReturnType<typeof loadSecurity>>;
