import "server-only";

import {
  auditTrailBrief,
  customerBrief,
  portfolioBrief,
  releaseImpactBrief,
  renewalBrief,
  type AssistantContext,
} from "@/domain/assistant";
import { canViewCommercial } from "@/domain/customers";
import {
  getCurrentStaff,
  getFinanceInputs,
  getReferenceTime,
  getStaffDirectory,
  listApiClients,
  listApprovals,
  listAuditEvents,
  listContracts,
  listCustomers,
  listDeployments,
  listLicenses,
  listReleases,
  listRiskRegister,
  listSupportCases,
} from "@/server/data";
import { AssistantPanel } from "./assistant-panel";

const DAY = 86_400_000;

/** Loads the records the assistant may use for this staff member and assembles briefs. */
export async function Assistant() {
  const [
    now,
    me,
    finance,
    customers,
    contracts,
    licenses,
    deployments,
    releases,
    approvals,
    cases,
    risks,
    audit,
    directory,
    clients,
  ] = await Promise.all([
    getReferenceTime(),
    getCurrentStaff(),
    getFinanceInputs(),
    listCustomers(),
    listContracts(),
    listLicenses(),
    listDeployments(),
    listReleases(),
    listApprovals(),
    listSupportCases(),
    listRiskRegister(),
    listAuditEvents(),
    getStaffDirectory(),
    listApiClients(),
  ]);
  const ctx: AssistantContext = {
    now,
    fx: finance.fx,
    canViewCommercial: canViewCommercial(me),
    customers,
    contracts,
    licenses,
    deployments,
    releases,
    approvals,
    cases,
    risks,
  };
  const clientName = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const actorName = (id: string) => directory[id]?.name ?? clientName[id] ?? id;

  // Correlations with several steps are the actions worth explaining.
  const correlations = [...new Set(audit.map((e) => e.correlationId))].filter(
    (id) => audit.filter((e) => e.correlationId === id).length > 1,
  );

  return (
    <AssistantPanel
      portfolio={portfolioBrief(ctx)}
      customers={[...customers]
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((c) => ({ id: c.id, label: c.displayName, brief: customerBrief(c, ctx) }))}
      renewals={contracts
        .filter((c) => (Date.parse(c.endsAt) - Date.parse(now)) / DAY <= 180)
        .sort((a, b) => a.endsAt.localeCompare(b.endsAt))
        .map((c) => ({
          id: c.id,
          label: `${customers.find((x) => x.id === c.customerId)?.displayName} · ${c.number}`,
          brief: renewalBrief(c, ctx),
        }))}
      releases={releases
        .filter((r) => r.endOfSupportAt)
        .sort((a, b) => a.endOfSupportAt!.localeCompare(b.endOfSupportAt!))
        .map((r) => ({
          id: r.id,
          label: `Release ${r.version}`,
          brief: releaseImpactBrief(r, ctx),
        }))}
      audits={correlations.map((id) => {
        const first = audit
          .filter((e) => e.correlationId === id)
          .sort((a, b) => a.at.localeCompare(b.at))[0]!;
        return {
          id,
          label: `${first.actionLabel} (${id})`,
          brief: auditTrailBrief(audit, id, actorName),
        };
      })}
    />
  );
}
