import type { Contract, Deployment, Release } from "@/domain/types";

/** Metadata defaults for test deployments; tests override what they assert on. */
export const deploymentMetadata = {
  profile: "eks",
  clusterId: "clu-test-01",
  country: "United Kingdom",
  residency: "UK",
  installKitVersion: "ik-2.4.0",
  preflight: "passed",
  backupStatus: "not_shared",
  maintenanceWindow: "Sun 02:00 – 05:00 UTC",
} satisfies Partial<Deployment>;

/** Release record defaults for tests: fully supported, all gates passed. */
export const releaseRecord = {
  minUpgradeFrom: "0.0.0",
  signed: true,
  provenance: true,
  gates: [{ name: "Release approval", status: "passed" }],
  compatibility: {
    eks: { status: "supported", kubernetes: "1.29 – 1.31" },
    aks: { status: "supported", kubernetes: "1.29 – 1.31" },
    gke: { status: "supported", kubernetes: "1.29 – 1.31" },
    openshift: { status: "supported", kubernetes: "OpenShift 4.14 – 4.16" },
    rke2: { status: "supported", kubernetes: "1.29 – 1.31" },
  },
  dependencies: [],
  notes: [],
} satisfies Partial<Release>;

/** Contract record defaults for tests: scope, documents and billing link. */
export const contractRecord = {
  legalEntity: "Test Legal Entity Ltd",
  scope: { "deployments.production.max": "2" },
  documents: { masterAgreement: "doc://msa/test", orderForm: "doc://order-forms/test" },
  billing: { invoiceSystemId: "NS-000001", paymentStatus: "current" },
} satisfies Partial<Contract>;
