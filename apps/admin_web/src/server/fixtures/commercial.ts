import type {
  Contract,
  Deployment,
  DeploymentEnvironment,
  License,
  LicenseState,
  RenewalStage,
  SupportState,
} from "@/domain/types";
import { createHash } from "node:crypto";
import { canonicalJson, canonicalPayload } from "@/domain/artifact";
import { customers } from "./customers";

const pad = (n: number, width = 5) => String(n).padStart(width, "0");

/** Deterministic pseudo-hash so fingerprints look real and stay stable. */
function hex(seed: string, length = 64): string {
  let h = 2166136261;
  let out = "";
  while (out.length < length) {
    for (const ch of seed + out.length) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    out += h.toString(16).padStart(8, "0");
  }
  return out.slice(0, length);
}

const renewalStages: Record<string, RenewalStage> = {
  cus_halden: "negotiation",
  cus_tamsin: "proposal",
  cus_atlas: "discovery",
  cus_corvane: "discovery",
  cus_harbour: "not_started",
};

export const contracts: Contract[] = customers
  .filter((c) => c.annualContractValue && c.nextRenewalAt)
  .map((c, i) => {
    const end = c.nextRenewalAt as string;
    const start = new Date(Date.parse(end) - 365 * 86_400_000 + 1000).toISOString();
    return {
      id: `ctr_${c.id.slice(4)}`,
      number: `APC-${pad(2025_000 + i * 13, 7)}`,
      customerId: c.id,
      productIds: c.productIds,
      status: renewalStages[c.id] && renewalStages[c.id] !== "not_started" ? "renewing" : "active",
      effectiveAt: start,
      endsAt: end,
      noticeDays: c.segment === "public_sector" ? 90 : 60,
      renewalType: c.segment === "enterprise" ? "manual" : "auto",
      annualContractValue: c.annualContractValue!,
      billingFrequency: c.segment === "enterprise" ? "annual" : "quarterly",
      purchaseOrderRef: c.segment === "public_sector" ? `PO-${pad(88_000 + i)}` : undefined,
      renewalStage: renewalStages[c.id] ?? "not_started",
      renewalOwnerId: c.owners.commercial_owner ?? "stf_02",
    };
  });

const licenseOverrides: Record<string, { state: LicenseState; expiresAt?: string }> = {
  "cus_tamsin:prd_relyxus": { state: "grace", expiresAt: "2026-10-05T23:59:59Z" },
  "cus_atlas:prd_relyxus": { state: "verification_failed" },
};

/** Contract lines not licensed yet; the Issue flow offers them. */
const notYetLicensed = new Set(["cus_vantage:prd_sentinel"]);

const entitlementSet = (deployments: number, tier: string) => [
  {
    key: "deployments.production.max",
    label: "Production deployments",
    value: String(deployments),
  },
  { key: "deployments.nonproduction.max", label: "Non-production deployments", value: "4" },
  { key: "support.tier", label: "Support tier", value: tier },
  { key: "modules.ai_routing", label: "AI routing module", value: "Enabled" },
  {
    key: "modules.regulatory_pack",
    label: "Regulatory reporting pack",
    value: tier === "mission_critical" ? "Enabled" : "Not included",
  },
];

export const licenses: License[] = contracts.flatMap((contract, i) => {
  const customer = customers.find((c) => c.id === contract.customerId)!;
  return contract.productIds.flatMap((productId, j) => {
    const key = `${customer.id}:${productId}`;
    if (notYetLicensed.has(key)) return [];
    const override = licenseOverrides[key];
    const allowance = customer.supportTier === "mission_critical" ? 3 : 2;
    const tierLabel = customer.supportTier.replace("_", " ");
    const id = `LIC_${pad(388 + i * 3 + j)}`;
    const revisionCount = 1 + ((i + j) % 3);
    const revisions = Array.from({ length: revisionCount }, (_, r) => ({
      revision: r + 1,
      issuedAt: new Date(Date.parse(contract.effectiveAt) + r * 47 * 86_400_000).toISOString(),
      issuedById: "stf_01",
      approvedById: r % 2 === 0 ? "stf_05" : "stf_06",
      signingKeyId: r === revisionCount - 1 ? "kms-sig-2026a" : "kms-sig-2025b",
      payloadHash: "",
      reason:
        r === 0
          ? "Initial issue from contract"
          : r === 1
            ? "Added non-production deployment allowance"
            : "Support tier upgrade",
      entitlements: entitlementSet(allowance - (r < revisionCount - 1 ? 1 : 0), tierLabel),
    }));
    const license: License = {
      id,
      customerId: customer.id,
      productId,
      contractId: contract.id,
      state: override?.state ?? "active",
      validFrom: contract.effectiveAt,
      expiresAt: override?.expiresAt ?? contract.endsAt,
      graceDays: 30,
      deploymentAllowance: allowance,
      deliveryState: customer.region === "Middle East" ? "offline_package" : "acknowledged",
      artifactFingerprint: `SHA256:${hex(`${id}-fp`, 40).toUpperCase()}`,
      lastVerificationAt:
        override?.state === "verification_failed" ? "2026-10-09T13:00:00Z" : "2026-10-12T02:00:00Z",
      revisions,
    };
    // Each revision records the real SHA-256 of its canonical payload, so artifacts can be
    // checked for tampering in the verify screen.
    for (const revision of revisions) {
      revision.payloadHash = `sha256:${createHash("sha256")
        .update(canonicalJson(canonicalPayload(license, revision)))
        .digest("hex")}`;
    }
    return license;
  });
});

const releaseFor: Record<string, string> = {
  cus_atlas: "2.1.0",
  cus_halden: "2.2.4",
  cus_tamsin: "2.3.1",
  cus_harbour: "2.3.1",
  cus_fenwick: "2.3.1",
  cus_qadira: "2.4.0",
  cus_orbis: "2.4.0",
};

const platformFor: Record<string, Deployment["platform"]> = {
  cus_corvane: "OpenShift",
  cus_orbis: "Azure",
  cus_qadira: "On premises",
  cus_harbour: "Google Cloud",
  cus_fenwick: "Azure",
};

const awsRegion: Record<string, string> = {
  UK: "eu-west-2",
  EU: "eu-central-1",
  "North America": "us-east-1",
  "Middle East": "me-central-1",
  APAC: "ap-southeast-1",
};

const supportFor = (customerId: string, env: DeploymentEnvironment): SupportState => {
  if (customerId === "cus_atlas") return env === "production" ? "unsupported" : "license_mismatch";
  if (customerId === "cus_halden") return "review_needed";
  if (customerId === "cus_qadira" && env === "dr") return "stale_check_in";
  if (customerId === "cus_tamsin" && env === "production") return "license_mismatch";
  return "supported";
};

export const deployments: Deployment[] = customers
  .filter((c) => c.status === "active" || c.lifecycleStage === "pilot_ready")
  .flatMap((c) => {
    const envs: DeploymentEnvironment[] =
      c.lifecycleStage === "pilot_ready"
        ? ["staging"]
        : c.supportTier === "mission_critical"
          ? ["production", "staging", "dr"]
          : ["production", "staging"];
    const license = licenses.find((l) => l.customerId === c.id && l.productId === "prd_relyxus");
    return envs.map((env, k) => ({
      id: `dep_${c.id.slice(4)}_${env}`,
      customerId: c.id,
      productId: "prd_relyxus",
      logicalName: `${c.id.slice(4)}-relyxus-${env === "dr" ? "dr" : env.slice(0, 4)}`,
      environment: env,
      platform: platformFor[c.id] ?? "AWS",
      kubernetes:
        platformFor[c.id] === "OpenShift"
          ? "OpenShift 4.16"
          : platformFor[c.id] === "Azure"
            ? "AKS 1.31"
            : platformFor[c.id] === "On premises"
              ? "RKE2 1.30"
              : platformFor[c.id] === "Google Cloud"
                ? "GKE 1.31"
                : "EKS 1.31",
      region: env === "dr" ? `${awsRegion[c.region]}-dr` : (awsRegion[c.region] ?? "eu-west-2"),
      releaseVersion:
        env === "staging" && c.id !== "cus_atlas" ? "2.4.1" : (releaseFor[c.id] ?? "2.4.1"),
      licenseId: license?.id,
      supportState: supportFor(c.id, env),
      lastCheckInAt:
        c.id === "cus_qadira" && env === "dr"
          ? "2026-09-27T04:00:00Z"
          : new Date(Date.parse("2026-10-13T06:00:00Z") - k * 3_600_000).toISOString(),
      technicalOwnerId: c.owners.technical_owner ?? "stf_04",
    }));
  });
