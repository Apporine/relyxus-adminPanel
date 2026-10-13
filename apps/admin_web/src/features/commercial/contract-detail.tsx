import { CalendarRange, FileSearch, Lock, PencilLine } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableId } from "@/components/ui/copyable-id";
import { DescriptionList } from "@/components/ui/description-list";
import { Field, FieldHint, Label, Textarea } from "@/components/ui/field";
import { Notice, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { daysToEnd, noticeDeadline, noticePassed } from "@/domain/renewals";
import { contractStatus, renewalStage } from "@/domain/status";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney } from "@/lib/format";
import { getContract, listContacts } from "@/server/data";
import { loadCommercial } from "./load";

const paymentLabel = {
  current: "Current",
  overdue: "Overdue",
  not_integrated: "Billing system not integrated",
};

/** Contract detail (spec §13): operating metadata, never a ledger or payment record. */
export async function ContractDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getContract(id);
  if (!contract) notFound();
  const [data, contacts] = await Promise.all([loadCommercial(), listContacts(contract.customerId)]);
  const customer = data.customerById[contract.customerId];
  const license = data.licenses.find((l) => l.contractId === contract.id);
  const signed = license?.revisions.at(-1)?.entitlements ?? [];
  const records = data.records.filter((r) => r.sourceContractId === contract.id);
  const procurement = contacts.find((c) => c.id === contract.procurementContactId);
  const days = daysToEnd(contract, data.now);
  const passed = noticePassed(contract, data.now);
  const money = (value: Parameters<typeof formatMoney>[0] | undefined) =>
    !data.canViewCommercial ? (
      <span className="inline-flex items-center gap-1 text-fg-muted">
        <Lock aria-hidden="true" className="size-3.5" />
        Requires finance scope
      </span>
    ) : value ? (
      formatMoney(value)
    ) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[{ label: "Commercial", href: "/commercial" }, { label: contract.number }]}
        />
        <PageHeader
          title={contract.number}
          description={`Contract with ${customer?.displayName ?? contract.customerId}`}
          meta={
            <>
              <CopyableId value={contract.id} label="Contract ID" />
              <StatusBadge
                tone={contractStatus[contract.status].tone}
                label={contractStatus[contract.status].label}
              />
              <Tag>{contract.renewalType === "auto" ? "Auto renews" : "Manual renewal"}</Tag>
              {contract.productIds.map((p) => (
                <Tag key={p}>{data.productNames[p] ?? p}</Tag>
              ))}
            </>
          }
          actions={
            <>
              <DesignPreviewDialog
                trigger="Edit contract"
                triggerIcon={<PencilLine aria-hidden="true" />}
                title="Edit contract record"
                description="Update operating metadata. Signed terms change only through a new order form or amendment."
                confirmLabel="Save changes"
              >
                <Field>
                  <Label htmlFor="edit-contract-reason">Reason</Label>
                  <Textarea id="edit-contract-reason" name="reason" required />
                  <FieldHint>The reason is stored with the audit record.</FieldHint>
                </Field>
              </DesignPreviewDialog>
              <Button asChild>
                <Link href={`/commercial/entitlements/${contract.customerId}`}>
                  <FileSearch aria-hidden="true" />
                  Customer entitlements
                </Link>
              </Button>
              <Button asChild variant="primary">
                <Link href={`/commercial/renewals/${contract.id}`}>
                  <CalendarRange aria-hidden="true" />
                  Open renewal workspace
                </Link>
              </Button>
            </>
          }
        />
      </div>

      <div className="grid stagger gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <Card aria-labelledby="identity-title">
          <CardHeader>
            <CardTitle id="identity-title">Contract identity</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList
              columns={2}
              items={[
                { term: "Legal entity", value: contract.legalEntity },
                { term: "Effective", value: formatDate(contract.effectiveAt) },
                { term: "Ends", value: formatDate(contract.endsAt) },
                {
                  term: "Renewal type",
                  value: contract.renewalType === "auto" ? "Automatic" : "Manual",
                },
                { term: "Notice period", value: `${contract.noticeDays} days` },
                {
                  term: "Notice deadline",
                  value: (
                    <span className={cn(passed && days >= 0 && "font-medium text-coral-text")}>
                      {formatDate(noticeDeadline(contract))}
                      {passed && days >= 0 ? " · passed" : ""}
                    </span>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card aria-labelledby="value-title">
          <CardHeader>
            <CardTitle id="value-title">Commercial value</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList
              columns={2}
              items={[
                { term: "Annual contract value", value: money(contract.annualContractValue) },
                { term: "Currency", value: contract.annualContractValue.currency },
                {
                  term: "Billing frequency",
                  value: contract.billingFrequency === "annual" ? "Annual" : "Quarterly",
                },
                { term: "Purchase order", value: contract.purchaseOrderRef },
              ]}
            />
          </CardContent>
        </Card>

        <Card aria-labelledby="renewal-title">
          <CardHeader>
            <CardTitle id="renewal-title">Renewal</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList
              columns={2}
              items={[
                { term: "Stage", value: renewalStage[contract.renewalStage] },
                { term: "Days to end", value: days >= 0 ? String(days) : "Ended" },
                { term: "Target value", value: money(contract.renewalTarget) },
                {
                  term: "Renewal owner",
                  value: data.staff[contract.renewalOwnerId]?.name,
                },
                { term: "Procurement contact", value: procurement?.name },
              ]}
            />
          </CardContent>
        </Card>

        <Card aria-labelledby="documents-title">
          <CardHeader>
            <CardTitle id="documents-title">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList
              items={[
                {
                  term: "Master agreement",
                  value: (
                    <code className="font-mono text-micro">
                      {contract.documents.masterAgreement}
                    </code>
                  ),
                },
                {
                  term: "Order form",
                  value: (
                    <code className="font-mono text-micro">{contract.documents.orderForm}</code>
                  ),
                },
                {
                  term: "Data processing agreement",
                  value: contract.documents.dataProcessingAgreement ? (
                    <code className="font-mono text-micro">
                      {contract.documents.dataProcessingAgreement}
                    </code>
                  ) : undefined,
                },
                {
                  term: "Security addendum",
                  value: contract.documents.securityAddendum ? (
                    <code className="font-mono text-micro">
                      {contract.documents.securityAddendum}
                    </code>
                  ) : undefined,
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card aria-labelledby="billing-title">
          <CardHeader>
            <CardTitle id="billing-title">External billing</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <DescriptionList
              columns={2}
              items={[
                {
                  term: "Invoice system ID",
                  value: <code className="font-mono">{contract.billing.invoiceSystemId}</code>,
                },
                { term: "Payment status", value: paymentLabel[contract.billing.paymentStatus] },
              ]}
            />
            <p className="text-micro text-fg-muted">
              Billing lives in the finance system. No payment or card data is stored here.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card aria-labelledby="scope-title">
        <CardHeader>
          <CardTitle id="scope-title">Scope and entitlements</CardTitle>
          {license ? (
            <Link
              href={`/licensing/${license.id}`}
              className="text-dense font-medium text-violet-text hover:underline"
            >
              Signed license {license.id}
            </Link>
          ) : null}
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {Object.keys(contract.scope).length === 0 ? (
            <div className="px-4">
              <Notice title="No scope recorded">Add scope from the order form.</Notice>
            </div>
          ) : (
            <Table label={`Scope of ${contract.number}`}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Entitlement</TableHeaderCell>
                  <TableHeaderCell>Contract</TableHeaderCell>
                  <TableHeaderCell>Entitlement record</TableHeaderCell>
                  <TableHeaderCell>Signed license</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(contract.scope).map(([key, value]) => {
                  const record = records.find((r) => r.key === key)?.value;
                  const inLicense = signed.find((e) => e.key === key);
                  const differs =
                    (record !== undefined && record !== value) ||
                    (inLicense !== undefined && inLicense.value !== value);
                  return (
                    <TableRow key={key}>
                      <TableCell className="text-fg">
                        {inLicense?.label ?? key}
                        <code className="block font-mono text-micro text-fg-muted">{key}</code>
                      </TableCell>
                      <TableCell className="font-medium text-fg">{value}</TableCell>
                      <TableCell>{record ?? "—"}</TableCell>
                      <TableCell className={cn(differs && "font-medium text-coral-text")}>
                        {inLicense?.value ?? "—"}
                        {differs ? " · differs" : ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ContractDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-20 w-2/3" />
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 rounded-card" />
        ))}
      </div>
    </div>
  );
}
