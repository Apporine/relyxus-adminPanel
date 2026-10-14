import "server-only";

import { toGbp } from "@/domain/finance";
import type { Dataset, DatasetField } from "@/domain/reports";
import {
  deploymentEnvironment,
  healthStatus,
  licenseState,
  lifecycleStage,
  renewalStage,
  roleName,
  supportState,
} from "@/domain/status";
import type { DatasetKey, Money } from "@/domain/types";
import { formatMoney } from "@/lib/format";
import {
  getFinanceInputs,
  getStaffDirectory,
  listApiClients,
  listAuditEvents,
  listContracts,
  listCustomers,
  listDeployments,
  listLicenses,
  listProducts,
  listStaff,
  listSupportCases,
} from "@/server/data";

const text = (key: string, label: string, extra: Partial<DatasetField> = {}): DatasetField => ({
  key,
  label,
  type: "text",
  classification: "Internal",
  ...extra,
});
const date = (key: string, label: string, extra: Partial<DatasetField> = {}): DatasetField => ({
  ...text(key, label, extra),
  type: "date",
});
const number = (key: string, label: string): DatasetField => ({
  ...text(key, label),
  type: "number",
});
const restricted = (requires: "commercial" | "security") => ({
  classification: "Restricted" as const,
  requires,
});

const day = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const slaLabel = { within: "Within SLA", at_risk: "SLA at risk", breached: "SLA breached" };
const resultLabel = { success: "Success", failure: "Failed", denied: "Denied" };

/**
 * Approved datasets for reports (spec §26). Money is shown in its own currency; a hidden
 * `__sort` companion holds the GBP equivalent so sorting compares like with like.
 */
export async function loadDatasets(): Promise<Record<DatasetKey, Dataset>> {
  const [
    customers,
    contracts,
    licenses,
    deployments,
    cases,
    staff,
    directory,
    audit,
    products,
    clients,
    finance,
  ] = await Promise.all([
    listCustomers(),
    listContracts(),
    listLicenses(),
    listDeployments(),
    listSupportCases(),
    listStaff(),
    getStaffDirectory(),
    listAuditEvents(),
    listProducts(),
    listApiClients(),
    getFinanceInputs(),
  ]);
  const customerName = Object.fromEntries(customers.map((c) => [c.id, c.displayName]));
  const productCode = Object.fromEntries(products.map((p) => [p.id, p.code]));
  const clientName = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const money = (m?: Money) =>
    m ? { value: formatMoney(m), sort: toGbp(m, finance.fx) } : { value: "", sort: "" };

  return {
    customers: {
      key: "customers",
      label: "Customers",
      description: "Customer accounts with lifecycle, health, ownership and contract value.",
      fields: [
        text("name", "Customer"),
        text("products", "Products"),
        text("stage", "Lifecycle stage"),
        text("health", "Health"),
        text("region", "Region"),
        text("segment", "Segment"),
        text("tier", "Support tier"),
        date("renewal", "Next renewal"),
        text("csOwner", "Success owner"),
        text("acv", "Annual contract value", restricted("commercial")),
      ],
      rows: customers.map((c) => {
        const acv = money(c.annualContractValue);
        return {
          name: c.displayName,
          products: c.productIds.map((p) => productCode[p]).join(", "),
          stage: lifecycleStage[c.lifecycleStage],
          health: healthStatus[c.health].label,
          region: c.region,
          segment: c.segment.replaceAll("_", " "),
          tier: c.supportTier.replaceAll("_", " "),
          renewal: day(c.nextRenewalAt),
          csOwner: c.owners.customer_success_owner
            ? (directory[c.owners.customer_success_owner]?.name ?? "")
            : "",
          acv: acv.value,
          acv__sort: acv.sort,
        };
      }),
    },
    contracts: {
      key: "contracts",
      label: "Contracts",
      description: "Contract records with term, renewal stage and value.",
      fields: [
        text("number", "Contract"),
        text("customer", "Customer"),
        text("status", "Status"),
        date("ends", "Ends"),
        text("stage", "Renewal stage"),
        number("notice", "Notice days"),
        text("acv", "Annual contract value", restricted("commercial")),
      ],
      rows: contracts.map((k) => {
        const acv = money(k.annualContractValue);
        return {
          number: k.number,
          customer: customerName[k.customerId] ?? k.customerId,
          status: k.status,
          ends: day(k.endsAt),
          stage: renewalStage[k.renewalStage],
          notice: k.noticeDays,
          acv: acv.value,
          acv__sort: acv.sort,
        };
      }),
    },
    licenses: {
      key: "licenses",
      label: "Licenses",
      description: "Commercial licenses with state, expiry and delivery.",
      fields: [
        text("id", "License"),
        text("customer", "Customer"),
        text("product", "Product"),
        text("state", "State"),
        date("expires", "Expires"),
        text("delivery", "Delivery"),
        number("allowance", "Deployment allowance"),
      ],
      rows: licenses.map((l) => ({
        id: l.id,
        customer: customerName[l.customerId] ?? l.customerId,
        product: productCode[l.productId] ?? l.productId,
        state: licenseState[l.state].label,
        expires: day(l.expiresAt),
        delivery: l.deliveryState.replaceAll("_", " "),
        allowance: l.deploymentAllowance,
      })),
    },
    deployments: {
      key: "deployments",
      label: "Deployments",
      description: "Customer deployments with release, platform and support state.",
      fields: [
        text("name", "Deployment"),
        text("customer", "Customer"),
        text("environment", "Environment"),
        text("platform", "Platform"),
        text("region", "Region", { classification: "Confidential" }),
        text("release", "Release"),
        text("support", "Support state"),
        date("checkIn", "Last check in"),
      ],
      rows: deployments.map((d) => ({
        name: d.logicalName,
        customer: customerName[d.customerId] ?? d.customerId,
        environment: deploymentEnvironment[d.environment],
        platform: d.platform,
        region: d.region,
        release: d.releaseVersion,
        support: supportState[d.supportState].label,
        checkIn: day(d.lastCheckInAt),
      })),
    },
    support_cases: {
      key: "support_cases",
      label: "Support cases",
      description:
        "Support case references with severity and SLA; content stays in the support platform.",
      fields: [
        text("reference", "Reference"),
        text("customer", "Customer"),
        text("severity", "Severity"),
        text("status", "Status"),
        text("sla", "SLA"),
        date("opened", "Opened"),
        text("owner", "Owner"),
      ],
      rows: cases.map((c) => ({
        reference: c.externalRef,
        customer: customerName[c.customerId] ?? c.customerId,
        severity: c.severity.replace("sev", "Sev "),
        status: c.status.replaceAll("_", " "),
        sla: slaLabel[c.slaState],
        opened: day(c.openedAt),
        owner: directory[c.ownerId]?.name ?? "",
      })),
    },
    staff_access: {
      key: "staff_access",
      label: "Staff access",
      description: "Staff accounts with roles, MFA and sign in; security fields are restricted.",
      fields: [
        text("name", "Staff"),
        text("title", "Title"),
        text("roles", "Roles", restricted("security")),
        text("mfa", "MFA", restricted("security")),
        date("lastSignIn", "Last sign in", restricted("security")),
      ],
      rows: staff.map((s) => ({
        name: s.name,
        title: s.title,
        roles: s.roles.map((r) => roleName[r]).join(", "),
        mfa: s.mfaEnabled ? "Enabled" : "Not enabled",
        lastSignIn: day(s.lastSignInAt),
      })),
    },
    audit_events: {
      key: "audit_events",
      label: "Audit events",
      description: "Administrative actions from the audit log.",
      fields: [
        date("at", "Time (UTC)"),
        text("actor", "Actor"),
        text("action", "Action"),
        text("object", "Object"),
        text("result", "Result"),
        text("impact", "Impact"),
      ],
      rows: audit.map((e) => ({
        at: e.at.replace("T", " ").slice(0, 16),
        actor: directory[e.actorId]?.name ?? clientName[e.actorId] ?? e.actorId,
        action: e.actionLabel,
        object: `${e.objectType} ${e.objectId}`,
        result: resultLabel[e.result],
        impact: e.highImpact ? "High" : "Standard",
      })),
    },
  };
}
