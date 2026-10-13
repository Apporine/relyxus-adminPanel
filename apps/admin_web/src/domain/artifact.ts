import type { License, LicenseRevision } from "./types";

/**
 * License artifact format (design track). An artifact carries a canonical payload, the
 * SHA-256 of that payload and a signature made by the License Issuer with a KMS key
 * (spec §15, §33). The control plane can check structure and integrity; signature
 * verification belongs to the License Issuer, never browser code.
 */

export const ARTIFACT_SCHEMA = "apporine.license/v1";

export interface LicensePayload {
  schema: typeof ARTIFACT_SCHEMA;
  licenseId: string;
  revision: number;
  customerId: string;
  productId: string;
  validFrom: string;
  expiresAt: string;
  graceDays: number;
  deploymentAllowance: number;
  entitlements: Record<string, string>;
}

export interface LicenseArtifact {
  payload: LicensePayload;
  payloadHash: string;
  signingKeyId: string;
  signature: string | null;
}

type PayloadSource = Pick<
  License,
  | "id"
  | "customerId"
  | "productId"
  | "validFrom"
  | "expiresAt"
  | "graceDays"
  | "deploymentAllowance"
>;

export function canonicalPayload(
  license: PayloadSource,
  revision: Pick<LicenseRevision, "revision" | "entitlements">,
): LicensePayload {
  return {
    schema: ARTIFACT_SCHEMA,
    licenseId: license.id,
    revision: revision.revision,
    customerId: license.customerId,
    productId: license.productId,
    validFrom: license.validFrom,
    expiresAt: license.expiresAt,
    graceDays: license.graceDays,
    deploymentAllowance: license.deploymentAllowance,
    entitlements: Object.fromEntries(revision.entitlements.map((e) => [e.key, e.value])),
  };
}

/** Deterministic JSON: object keys sorted at every level, no insignificant whitespace. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** SHA-256 of the canonical payload, as `sha256:<hex>`. Uses Web Crypto (browser and Node). */
export async function hashPayload(payload: LicensePayload): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

// Inspection --------------------------------------------------------------------------------

export type CheckStatus = "pass" | "fail" | "not_checked";

export interface ArtifactCheck {
  id: "parse" | "schema" | "integrity" | "known" | "record" | "state" | "signature";
  label: string;
  status: CheckStatus;
  detail: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

function validateShape(value: unknown): value is LicenseArtifact {
  if (!isRecord(value) || !isRecord(value.payload)) return false;
  const p = value.payload;
  return (
    p.schema === ARTIFACT_SCHEMA &&
    typeof p.licenseId === "string" &&
    typeof p.revision === "number" &&
    typeof p.customerId === "string" &&
    typeof p.productId === "string" &&
    typeof p.validFrom === "string" &&
    typeof p.expiresAt === "string" &&
    typeof p.graceDays === "number" &&
    typeof p.deploymentAllowance === "number" &&
    isRecord(p.entitlements) &&
    Object.values(p.entitlements).every((v) => typeof v === "string") &&
    typeof value.payloadHash === "string" &&
    typeof value.signingKeyId === "string" &&
    (value.signature === null || typeof value.signature === "string")
  );
}

/**
 * Checks a pasted artifact against the control plane record. Every check reports a
 * result; later checks are "not checked" when an earlier one makes them meaningless.
 */
export async function inspectArtifact(
  text: string,
  licenses: License[],
): Promise<{ checks: ArtifactCheck[]; artifact?: LicenseArtifact; verdict: "valid" | "invalid" }> {
  const checks: ArtifactCheck[] = [];
  const skip = (from: ArtifactCheck["id"][]) =>
    from.forEach((id) =>
      checks.push({
        id,
        label: checkLabels[id],
        status: "not_checked",
        detail: "Skipped because an earlier check failed.",
      }),
    );

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
    checks.push({
      id: "parse",
      label: checkLabels.parse,
      status: "pass",
      detail: "The artifact is well-formed JSON.",
    });
  } catch {
    checks.push({
      id: "parse",
      label: checkLabels.parse,
      status: "fail",
      detail: "The text is not valid JSON.",
    });
    skip(["schema", "integrity", "known", "record", "state", "signature"]);
    return { checks, verdict: "invalid" };
  }

  if (!validateShape(parsed)) {
    checks.push({
      id: "schema",
      label: checkLabels.schema,
      status: "fail",
      detail: `Fields do not match ${ARTIFACT_SCHEMA}.`,
    });
    skip(["integrity", "known", "record", "state", "signature"]);
    return { checks, verdict: "invalid" };
  }
  const artifact = parsed;
  checks.push({
    id: "schema",
    label: checkLabels.schema,
    status: "pass",
    detail: `Matches ${ARTIFACT_SCHEMA}.`,
  });

  const computed = await hashPayload(artifact.payload);
  const intact = computed === artifact.payloadHash;
  checks.push({
    id: "integrity",
    label: checkLabels.integrity,
    status: intact ? "pass" : "fail",
    detail: intact
      ? "The payload hash matches the payload."
      : "The payload was changed after hashing. Computed hash differs from the declared hash.",
  });

  const license = licenses.find((l) => l.id === artifact.payload.licenseId);
  const revision = license?.revisions.find((r) => r.revision === artifact.payload.revision);
  checks.push({
    id: "known",
    label: checkLabels.known,
    status: license && revision ? "pass" : "fail",
    detail: license
      ? revision
        ? `${license.id} revision ${revision.revision} exists in the control plane.`
        : `${license.id} has no revision ${artifact.payload.revision}.`
      : `No license ${artifact.payload.licenseId} in the control plane.`,
  });

  if (license && revision) {
    const matches =
      revision.payloadHash === artifact.payloadHash &&
      revision.signingKeyId === artifact.signingKeyId;
    checks.push({
      id: "record",
      label: checkLabels.record,
      status: matches ? "pass" : "fail",
      detail: matches
        ? "Hash and signing key match the immutable revision record."
        : "The declared hash or signing key differs from the revision record.",
    });
    const latest = license.revisions.at(-1)?.revision === revision.revision;
    const usable = latest && (license.state === "active" || license.state === "grace");
    checks.push({
      id: "state",
      label: checkLabels.state,
      status: usable ? "pass" : "fail",
      detail: !latest
        ? `Superseded by revision ${license.revisions.at(-1)?.revision}.`
        : `License state is ${license.state.replaceAll("_", " ")}.`,
    });
  } else {
    skip(["record", "state"]);
  }

  checks.push({
    id: "signature",
    label: checkLabels.signature,
    status: "not_checked",
    detail:
      artifact.signature === null
        ? "The artifact carries no signature. Signatures are produced and verified by the License Issuer."
        : "Signature verification runs in the License Issuer with the KMS public key, not in the browser.",
  });

  const verdict = checks.every((c) => c.status !== "fail") ? "valid" : "invalid";
  return { checks, artifact, verdict };
}

const checkLabels: Record<ArtifactCheck["id"], string> = {
  parse: "Readable",
  schema: "Format",
  integrity: "Payload integrity",
  known: "Known license",
  record: "Matches revision record",
  state: "Current and usable",
  signature: "Signature",
};
