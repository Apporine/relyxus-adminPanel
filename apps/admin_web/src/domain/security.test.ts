import {
  breakGlassState,
  credentialStatus,
  effectiveRoles,
  isIdleClient,
  postureState,
  reviewProgress,
  reviewStatus,
  roleConflicts,
  rotationStatus,
  securityFindings,
  unusedRoles,
  type PostureInput,
} from "./security";
import type {
  AccessReviewCampaign,
  ApiClient,
  BreakGlassActivation,
  SigningKey,
  StaffAccess,
  StaffUser,
} from "./types";

const now = "2026-10-13T09:00:00Z";

function person(id: string, overrides: Partial<StaffUser> = {}): StaffUser {
  return {
    id,
    name: `Person ${id}`,
    email: `${id}@apporine.example`,
    title: "Engineer",
    roles: ["customer_success"],
    productScope: [],
    mfaEnabled: true,
    lastSignInAt: "2026-10-12T09:00:00Z",
    ...overrides,
  };
}

function access(staffId: string, overrides: Partial<StaffAccess> = {}): StaffAccess {
  return {
    staffId,
    identitySource: "Entra ID",
    authMethod: "Phishing-resistant MFA",
    status: "active",
    activeSessions: 1,
    failedSignIns30d: 0,
    roleLastUsedAt: { customer_success: "2026-10-12T09:00:00Z" },
    temporaryGrants: [],
    ...overrides,
  };
}

function client(id: string, overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    id,
    name: `Client ${id}`,
    ownerId: "stf_01",
    purpose: "Test",
    scopes: ["customers:read"],
    environment: "PRODUCTION",
    state: "active",
    createdAt: "2026-01-01T00:00:00Z",
    lastUsedAt: "2026-10-13T08:00:00Z",
    credentialCreatedAt: "2026-06-01T00:00:00Z",
    rotationDueAt: "2027-06-01T00:00:00Z",
    ...overrides,
  };
}

function key(id: string, overrides: Partial<SigningKey> = {}): SigningKey {
  return {
    id,
    algorithm: "Ed25519",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    nextRotationAt: "2027-01-01T00:00:00Z",
    publicKeyFingerprint: "SHA256:test",
    verifierAdoption: { trusted: 3, total: 3 },
    custodianId: "stf_06",
    ...overrides,
  };
}

function review(overrides: Partial<AccessReviewCampaign> = {}): AccessReviewCampaign {
  return {
    id: "acr_1",
    title: "Quarterly review",
    scope: "All",
    reviewerId: "stf_06",
    startedAt: "2026-09-01T00:00:00Z",
    dueAt: "2026-10-20T00:00:00Z",
    items: [
      { staffId: "a", role: "auditor", disposition: "keep" },
      { staffId: "b", role: "auditor", disposition: "pending" },
    ],
    ...overrides,
  };
}

function activation(overrides: Partial<BreakGlassActivation> = {}): BreakGlassActivation {
  return {
    id: "bg_1",
    staffId: "a",
    incidentRef: "INC-1",
    reason: "Outage",
    scope: "License Operator, 2 hours",
    state: "active",
    requestedAt: "2026-10-13T07:00:00Z",
    activatedAt: "2026-10-13T07:10:00Z",
    expiresAt: "2026-10-13T10:00:00Z",
    actionsRecorded: 0,
    evidence: [],
    ...overrides,
  };
}

const empty: PostureInput = {
  now,
  staff: [],
  access: [],
  reviews: [],
  clients: [],
  keys: [],
  breakGlass: [],
  signals: [],
};

describe("roles", () => {
  it("detects segregation of duties conflicts", () => {
    expect(roleConflicts(["license_operator", "license_approver"])).toHaveLength(1);
    expect(roleConflicts(["license_operator", "customer_success"])).toHaveLength(0);
  });

  it("counts unexpired, unremoved temporary grants as effective roles", () => {
    const grants = access("a", {
      temporaryGrants: [
        {
          role: "license_approver",
          grantedAt: "2026-10-01T00:00:00Z",
          expiresAt: "2026-10-20T00:00:00Z",
          grantedById: "x",
          reason: "Cover",
        },
        {
          role: "auditor",
          grantedAt: "2026-10-01T00:00:00Z",
          expiresAt: "2026-10-05T00:00:00Z",
          grantedById: "x",
          reason: "Old",
        },
      ],
    });
    expect(effectiveRoles(person("a"), grants, now)).toEqual([
      "customer_success",
      "license_approver",
    ]);
  });

  it("flags roles never used or unused for 90 days", () => {
    const p = person("a", { roles: ["customer_success", "auditor", "finance_viewer"] });
    const a = access("a", {
      roleLastUsedAt: { customer_success: now, finance_viewer: "2026-06-01T00:00:00Z" },
    });
    expect(unusedRoles(p, a, now)).toEqual(["auditor", "finance_viewer"]);
  });
});

describe("access reviews", () => {
  it("reports progress and overdue state", () => {
    expect(reviewProgress(review())).toEqual({ decided: 1, total: 2, pending: 1 });
    expect(reviewStatus(review(), now)).toBe("open");
    expect(reviewStatus(review({ dueAt: "2026-10-01T00:00:00Z" }), now)).toBe("overdue");
    expect(
      reviewStatus(
        review({ dueAt: "2026-10-01T00:00:00Z", closedAt: "2026-09-30T00:00:00Z" }),
        now,
      ),
    ).toBe("closed");
  });
});

describe("credentials and keys", () => {
  it("classifies API credential rotation", () => {
    expect(credentialStatus(client("a"), now)).toBe("current");
    expect(credentialStatus(client("a", { rotationDueAt: "2026-10-30T00:00:00Z" }), now)).toBe(
      "due_soon",
    );
    expect(credentialStatus(client("a", { rotationDueAt: "2026-10-01T00:00:00Z" }), now)).toBe(
      "overdue",
    );
    expect(credentialStatus(client("a", { state: "disabled" }), now)).toBe("inactive");
  });

  it("flags active clients idle for 60 days", () => {
    expect(isIdleClient(client("a", { lastUsedAt: "2026-07-01T00:00:00Z" }), now)).toBe(true);
    expect(isIdleClient(client("a"), now)).toBe(false);
    expect(
      isIdleClient(client("a", { state: "disabled", lastUsedAt: "2026-01-01T00:00:00Z" }), now),
    ).toBe(false);
  });

  it("reads rotation status from the active key", () => {
    expect(rotationStatus([key("k")], now)).toBe("scheduled");
    expect(rotationStatus([key("k", { nextRotationAt: "2026-11-01T00:00:00Z" })], now)).toBe("due");
    expect(rotationStatus([key("k", { nextRotationAt: "2026-10-01T00:00:00Z" })], now)).toBe(
      "overdue",
    );
    expect(rotationStatus([key("k", { status: "retired" })], now)).toBe("none");
  });

  it("treats an active break glass past expiry as expired", () => {
    expect(breakGlassState(activation(), now)).toBe("active");
    expect(breakGlassState(activation({ expiresAt: "2026-10-13T08:00:00Z" }), now)).toBe("expired");
  });
});

describe("security posture", () => {
  it("is healthy with no findings", () => {
    const findings = securityFindings({
      ...empty,
      staff: [person("a")],
      access: [access("a")],
      clients: [client("c")],
      keys: [key("k")],
    });
    expect(findings).toEqual([]);
    expect(postureState(findings)).toBe("healthy");
  });

  it("raises staff findings most severe first", () => {
    const findings = securityFindings({
      ...empty,
      staff: [
        person("a", { roles: ["license_operator", "license_approver"] }),
        person("b", { mfaEnabled: false, lastSignInAt: "2026-08-01T00:00:00Z" }),
      ],
      access: [
        access("a", {
          roleLastUsedAt: { license_operator: now, license_approver: now },
          failedSignIns30d: 6,
        }),
        access("b"),
      ],
    });
    expect(findings.map((f) => f.kind)).toEqual([
      "segregation_conflict",
      "failed_auth",
      "stale_account",
      "mfa_gap",
    ]);
    expect(postureState(findings)).toBe("attention");
  });

  it("skips suspended accounts", () => {
    const findings = securityFindings({
      ...empty,
      staff: [person("a", { mfaEnabled: false })],
      access: [access("a", { status: "suspended" })],
    });
    expect(findings).toEqual([]);
  });

  it("flags expired grants that were never removed", () => {
    const findings = securityFindings({
      ...empty,
      staff: [person("a")],
      access: [
        access("a", {
          temporaryGrants: [
            {
              role: "license_operator",
              grantedAt: "2026-09-01T00:00:00Z",
              expiresAt: "2026-10-01T00:00:00Z",
              grantedById: "x",
              reason: "Cover",
            },
          ],
        }),
      ],
    });
    expect(findings.map((f) => f.kind)).toEqual(["expired_grant"]);
  });

  it("prioritises an overdue access review, then key rotation", () => {
    const rotation = securityFindings({
      ...empty,
      keys: [key("k", { nextRotationAt: "2026-10-20T00:00:00Z" })],
    });
    expect(postureState(rotation)).toBe("key_rotation_due");

    const overdue = securityFindings({
      ...empty,
      reviews: [review({ dueAt: "2026-10-01T00:00:00Z" })],
      keys: [key("k", { nextRotationAt: "2026-10-20T00:00:00Z" })],
    });
    expect(overdue[0]?.kind).toBe("access_review_overdue");
    expect(postureState(overdue)).toBe("overdue_review");
  });

  it("flags partial verifier adoption of a planned key", () => {
    const findings = securityFindings({
      ...empty,
      keys: [key("k"), key("n", { status: "planned", verifierAdoption: { trusted: 2, total: 3 } })],
    });
    expect(findings.map((f) => f.kind)).toEqual(["verifier_adoption"]);
  });

  it("flags active break glass and unusual revoke volume", () => {
    const findings = securityFindings({
      ...empty,
      staff: [person("a")],
      access: [access("a")],
      breakGlass: [activation()],
      signals: [
        { week: "2026-09-28", failedAdminAuth: 0, revokeRequests: 1, openFindings: 0 },
        { week: "2026-10-05", failedAdminAuth: 0, revokeRequests: 1, openFindings: 0 },
        { week: "2026-10-12", failedAdminAuth: 0, revokeRequests: 3, openFindings: 0 },
      ],
    });
    expect(findings.map((f) => f.kind)).toEqual(["break_glass_active", "revoke_volume"]);
  });
});
