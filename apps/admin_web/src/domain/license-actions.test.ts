import {
  actionAvailability,
  eligibleApprovers,
  licenseActionPolicy,
  renewedExpiry,
} from "./license-actions";
import type { StaffUser } from "./types";

const operator = { roles: ["license_operator" as const] };

describe("license action policy", () => {
  it("uses the spec §31 copy", () => {
    expect(licenseActionPolicy.revoke).toMatchObject({
      label: "Revoke license",
      title: "Revoke license",
    });
    expect(licenseActionPolicy.issue.title).toBe("Issue commercial license");
    expect(licenseActionPolicy.renew.message).toMatch(
      /^Review validity, entitlements and deployment allowance/,
    );
  });

  it("makes revocation four-eyes with step-up and typed confirmation", () => {
    expect(licenseActionPolicy.revoke).toMatchObject({
      highImpact: true,
      approvals: 2,
      stepUp: true,
      typedConfirmation: true,
    });
    expect(licenseActionPolicy.renew).toMatchObject({
      highImpact: false,
      approvals: 1,
      stepUp: false,
    });
  });
});

describe("actionAvailability", () => {
  it("requires the License Operator role", () => {
    expect(
      actionAvailability("renew", { roles: ["portfolio_admin"] }, { state: "active" }),
    ).toEqual({
      allowed: false,
      reason: "Requires the License Operator role.",
    });
  });

  it("respects the license state", () => {
    expect(actionAvailability("suspend", operator, { state: "revoked" })).toEqual({
      allowed: false,
      reason: "Not available while the license is revoked.",
    });
    expect(actionAvailability("revoke", operator, { state: "verification_failed" })).toEqual({
      allowed: true,
    });
    expect(actionAvailability("issue", operator)).toEqual({ allowed: true });
  });

  it("blocks a second request while one is pending", () => {
    expect(actionAvailability("renew", operator, { state: "active" }, { id: "apr_1" })).toEqual({
      allowed: false,
      reason: "Request apr_1 is already awaiting a decision.",
    });
  });
});

describe("eligibleApprovers", () => {
  it("excludes the requester even when they hold the approver role", () => {
    const staff = [
      { id: "a", roles: ["license_operator", "license_approver"] },
      { id: "b", roles: ["license_approver"] },
      { id: "c", roles: ["auditor"] },
    ] as StaffUser[];
    expect(eligibleApprovers(staff, "a").map((s) => s.id)).toEqual(["b"]);
  });
});

describe("renewedExpiry", () => {
  it("extends by calendar months and clamps to month end", () => {
    expect(renewedExpiry("2026-11-14T23:59:59Z", 12)).toBe("2027-11-14T23:59:59.000Z");
    expect(renewedExpiry("2026-01-31T00:00:00Z", 1)).toBe("2026-02-28T00:00:00.000Z");
    expect(renewedExpiry("2026-10-05T23:59:59Z", 24)).toBe("2028-10-05T23:59:59.000Z");
  });
});
