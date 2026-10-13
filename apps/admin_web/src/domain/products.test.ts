import { contractRecord, deploymentMetadata } from "@/test/builders";
import { productCustomers, productSummary, type ProductContext } from "./products";
import type { Contract, Customer, Deployment, License, Product, SupportCase } from "./types";

const now = "2026-10-13T09:00:00Z";
const product = { id: "prd_a", name: "Alpha" } as Product;

const customer = (id: string, overrides: Partial<Customer> = {}) =>
  ({
    id,
    displayName: id.toUpperCase(),
    status: "active",
    productIds: ["prd_a"],
    ...overrides,
  }) as Customer;

const contract = (customerId: string, endsAt: string, amountMinor: number): Contract => ({
  id: `ctr_${customerId}`,
  number: "APC",
  customerId,
  productIds: ["prd_a"],
  status: "active",
  effectiveAt: "2025-01-01T00:00:00Z",
  endsAt,
  noticeDays: 60,
  renewalType: "manual",
  annualContractValue: { currency: "GBP", amountMinor },
  billingFrequency: "annual",
  renewalStage: "not_started",
  renewalOwnerId: "stf_02",
  ...contractRecord,
});

const license = (customerId: string, state: License["state"]) =>
  ({ id: `LIC_${customerId}_${state}`, customerId, productId: "prd_a", state }) as License;

const deployment = (customerId: string, environment: Deployment["environment"]): Deployment => ({
  id: `dep_${customerId}_${environment}`,
  customerId,
  productId: "prd_a",
  logicalName: customerId,
  environment,
  platform: "AWS",
  kubernetes: "EKS 1.31",
  region: "eu-west-2",
  releaseVersion: "2.4.1",
  supportState: "supported",
  technicalOwnerId: "stf_04",
  ...deploymentMetadata,
});

const supportCase = (customerId: string, status: SupportCase["status"]) =>
  ({ id: `${customerId}_${status}`, customerId, status }) as SupportCase;

const ctx: ProductContext = {
  now,
  customers: [
    customer("cus_b"),
    customer("cus_a"),
    customer("cus_c", { status: "onboarding" }),
    customer("cus_x", { productIds: ["prd_other"] }),
  ],
  contracts: [
    contract("cus_a", "2026-11-14T00:00:00Z", 1000),
    contract("cus_b", "2027-09-01T00:00:00Z", 500),
  ],
  licenses: [license("cus_a", "active"), license("cus_a", "suspended"), license("cus_b", "grace")],
  deployments: [
    deployment("cus_a", "production"),
    deployment("cus_a", "staging"),
    deployment("cus_b", "production"),
  ],
  cases: [
    supportCase("cus_a", "open"),
    supportCase("cus_a", "resolved"),
    supportCase("cus_b", "pending_customer"),
  ],
};

describe("product customers", () => {
  it("lists customers holding the product with value, licenses, deployments and cases", () => {
    const rows = productCustomers(product, ctx);
    expect(rows.map((r) => r.customer.id)).toEqual(["cus_a", "cus_b", "cus_c"]);
    expect(rows[0]).toMatchObject({
      activeLicenses: 1,
      deployments: 2,
      openCases: 1,
      renewalAt: "2026-11-14T00:00:00Z",
      annualContractValue: { currency: "GBP", amountMinor: 1000 },
    });
    expect(rows[1]).toMatchObject({ activeLicenses: 1, renewalAt: undefined, openCases: 1 });
    expect(rows[2]).toMatchObject({ annualContractValue: undefined, deployments: 0 });
  });
});

describe("product summary", () => {
  it("totals customers, value, licenses, deployments, renewal exposure and cases", () => {
    expect(productSummary(product, ctx)).toEqual({
      customers: 3,
      activeCustomers: 2,
      annualContractValue: [{ currency: "GBP", amountMinor: 1500 }],
      activeLicenses: 2,
      deployments: 3,
      productionDeployments: 2,
      renewalExposure: [{ currency: "GBP", amountMinor: 1000 }],
      renewalsDue: 1,
      openCases: 2,
    });
  });
});
