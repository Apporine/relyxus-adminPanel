import { GitCompareArrows, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Notice, Skeleton } from "@/components/ui/feedback";
import { Field, FieldHint, Input, Label, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentNav } from "@/components/ui/segment-nav";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { driftKindLabel, driftReview, entitlementRows } from "@/domain/entitlements";
import type { EntitlementDefinition } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatDate, plural } from "@/lib/format";
import { loadCommercial } from "./load";

const lifecycleTone: Record<EntitlementDefinition["lifecycle"], "healthy" | "neutral" | "risk"> = {
  active: "healthy",
  draft: "neutral",
  deprecated: "risk",
};

const lifecycleLabel = { active: "Active", draft: "Draft", deprecated: "Deprecated" };

/**
 * Entitlement definitions (spec §14): product scoped machine key, label, type,
 * validation, default, commercial description and lifecycle.
 */
export async function EntitlementDefinitions({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, data] = await Promise.all([searchParams, loadCommercial()]);
  const requested = Array.isArray(params.product) ? params.product[0] : params.product;
  const product = data.products.find((p) => p.id === requested) ?? data.products[0];
  if (!product) return null;
  const definitions = data.definitions.filter((d) => d.productId === product.id);

  return (
    <div className="flex flex-col gap-4">
      <SegmentNav
        label="Product"
        items={data.products.map((p) => ({
          href: `/commercial/entitlements?product=${p.id}`,
          label: p.name,
          current: p.id === product.id,
        }))}
      />
      <Notice title="Security controls are never entitlements">
        Universal security controls such as audit logging, encryption and SSO apply to every
        customer and are not sold or switched off as commercial options.
      </Notice>
      <Card>
        <Table label={`${product.name} entitlement definitions`}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Entitlement</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Validation</TableHeaderCell>
              <TableHeaderCell>Default</TableHeaderCell>
              <TableHeaderCell>Description</TableHeaderCell>
              <TableHeaderCell>Lifecycle</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {definitions.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="whitespace-nowrap">
                  <span className="font-medium text-fg">{d.label}</span>
                  <code className="block font-mono text-micro text-fg-muted">{d.key}</code>
                </TableCell>
                <TableCell className="capitalize">
                  {d.dataType}
                  {d.comparison === "allowance" ? (
                    <span className="block text-micro text-fg-muted normal-case">Allowance</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  {d.validation}
                  {d.allowedValues ? (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {d.allowedValues.map((v) => (
                        <Tag key={v}>{v}</Tag>
                      ))}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="font-mono text-micro">{d.defaultValue}</TableCell>
                <TableCell className="min-w-64">{d.description}</TableCell>
                <TableCell>
                  <StatusBadge
                    tone={lifecycleTone[d.lifecycle]}
                    label={lifecycleLabel[d.lifecycle]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/**
 * Drift review (spec §14): where contract, entitlement record, signed license and
 * deployment observed metadata disagree.
 */
export async function DriftReview() {
  const data = await loadCommercial();
  const items = driftReview({
    definitions: data.definitions,
    contracts: data.contracts,
    licenses: data.licenses,
    records: data.records,
    observed: data.observed,
  });

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No entitlement drift"
        body="Contracts, entitlement records, signed licenses and deployment check ins agree."
        className="rounded-card border border-dashed border-border-strong bg-surface"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-fg-secondary" aria-live="polite">
        {plural(items.length, "mismatch", "mismatches")} across{" "}
        {plural(new Set(items.map((i) => i.customerId)).size, "customer")}.
      </p>
      <ul className="flex stagger flex-col gap-3">
        {items.map((item) => {
          const customer = data.customerById[item.customerId];
          return (
            <li
              key={`${item.customerId}-${item.definition.key}`}
              className="rounded-card border border-s-[3px] border-border border-s-coral bg-surface p-4 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-card-title text-fg">
                    <Link
                      href={`/commercial/entitlements/${item.customerId}`}
                      className="hover:text-violet-text hover:underline"
                    >
                      {customer?.displayName ?? item.customerId}
                    </Link>
                    <span className="font-normal text-fg-muted"> · {item.definition.label}</span>
                  </h2>
                  <ul className="mt-2 flex flex-col gap-1">
                    {item.findings.map((f) => (
                      <li key={f.kind} className="text-dense text-fg-secondary">
                        <span className="font-semibold text-coral-text">
                          {driftKindLabel[f.kind]}.
                        </span>{" "}
                        {f.detail}
                      </li>
                    ))}
                  </ul>
                </div>
                {item.licenseId ? (
                  <Link
                    href={`/licensing/${item.licenseId}`}
                    className="font-mono text-micro text-violet-text hover:underline"
                  >
                    {item.licenseId}
                  </Link>
                ) : null}
              </div>
              <SourceStrip sources={item.sources} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SourceStrip({
  sources,
}: {
  sources: { contract?: string; entitlement?: string; license?: string; observed?: string };
}) {
  const cells = [
    ["Contract", sources.contract],
    ["Entitlement", sources.entitlement],
    ["Signed license", sources.license],
    ["Observed", sources.observed],
  ] as const;
  return (
    <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cells.map(([label, value]) => (
        <div key={label} className="rounded-control bg-surface-sunken px-3 py-2">
          <dt className="text-micro text-fg-muted">{label}</dt>
          <dd className="text-body font-semibold text-fg">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Customer entitlement detail (spec §14): each right with its source contract, dates,
 * override, approval, history and the four-way comparison.
 */
export async function CustomerEntitlementDetail({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const data = await loadCommercial();
  const customer = data.customerById[customerId];
  if (!customer) notFound();
  const licenses = data.licenses.filter((l) => l.customerId === customerId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Commercial", href: "/commercial" },
            { label: "Entitlements", href: "/commercial/entitlements" },
            { label: customer.displayName },
          ]}
        />
        <PageHeader
          title={`${customer.displayName} entitlements`}
          description="Versioned rights derived from contracts. Changes preview their license impact before they apply."
        />
      </div>
      {licenses.length === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="No entitlements yet"
          body="Entitlements appear once a contract is recorded and licensed for this customer."
          className="rounded-card border border-dashed border-border-strong bg-surface"
        />
      ) : null}
      {licenses.map((license) => {
        const contract = data.contracts.find((c) => c.id === license.contractId);
        const rows = entitlementRows({
          customerId,
          productId: license.productId,
          definitions: data.definitions,
          contract,
          license,
          records: data.records,
          observed: data.observed,
        });
        return (
          <Card key={license.id} aria-labelledby={`ent-${license.id}`}>
            <CardHeader>
              <div>
                <CardTitle id={`ent-${license.id}`}>
                  {data.productNames[license.productId] ?? license.productId}
                </CardTitle>
                <CardDescription>
                  Source contract{" "}
                  {contract ? (
                    <Link
                      href={`/commercial/contracts/${contract.id}`}
                      className="font-mono text-violet-text hover:underline"
                    >
                      {contract.number}
                    </Link>
                  ) : (
                    "not recorded"
                  )}{" "}
                  · signed license{" "}
                  <Link
                    href={`/licensing/${license.id}`}
                    className="font-mono text-violet-text hover:underline"
                  >
                    {license.id}
                  </Link>
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <Table label={`${data.productNames[license.productId]} entitlements`}>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Entitlement</TableHeaderCell>
                    <TableHeaderCell>Contract</TableHeaderCell>
                    <TableHeaderCell>Record</TableHeaderCell>
                    <TableHeaderCell>Signed</TableHeaderCell>
                    <TableHeaderCell>Observed</TableHeaderCell>
                    <TableHeaderCell>Effective</TableHeaderCell>
                    <TableHeaderCell>Override</TableHeaderCell>
                    <TableHeaderCell>
                      <span className="sr-only">Actions</span>
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const drift = row.findings.length > 0;
                    return (
                      <TableRow
                        key={row.definition.key}
                        className={cn(drift && "bg-coral-subtle/40")}
                      >
                        <TableCell className="whitespace-nowrap">
                          <span className="font-medium text-fg">{row.definition.label}</span>
                          {drift ? (
                            <span className="block text-micro font-medium text-coral-text">
                              {row.findings.map((f) => driftKindLabel[f.kind]).join(" · ")}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>{row.sources.contract ?? "—"}</TableCell>
                        <TableCell className="font-medium text-fg">
                          {row.sources.entitlement ?? "—"}
                        </TableCell>
                        <TableCell>{row.sources.license ?? "—"}</TableCell>
                        <TableCell>{row.sources.observed ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.record ? (
                            <>
                              {formatDate(row.record.effectiveAt)}
                              <span className="block text-micro text-fg-muted">
                                to {formatDate(row.record.expiresAt)}
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="min-w-48">
                          {row.record?.overrideReason ? (
                            <>
                              {row.record.overrideReason}
                              {row.record.approvalId ? (
                                <span className="block font-mono text-micro text-fg-muted">
                                  {row.record.approvalId}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <DesignPreviewDialog
                            trigger="Propose change"
                            triggerVariant="ghost"
                            triggerSize="sm"
                            title={`Change ${row.definition.label.toLowerCase()}`}
                            description={`Current value ${row.sources.entitlement ?? "not set"} from ${contract?.number ?? "the source contract"}. Any change to signed rights needs a new license revision and approval.`}
                            confirmLabel="Request change"
                          >
                            <Field>
                              <Label htmlFor={`proposed-${row.definition.key}`}>
                                Proposed value
                              </Label>
                              <Input
                                id={`proposed-${row.definition.key}`}
                                name="proposed"
                                defaultValue={row.sources.contract ?? row.sources.entitlement}
                                required
                              />
                              <FieldHint>{row.definition.validation}</FieldHint>
                            </Field>
                            <Field>
                              <Label htmlFor={`reason-${row.definition.key}`}>Reason</Label>
                              <Textarea
                                id={`reason-${row.definition.key}`}
                                name="reason"
                                required
                              />
                            </Field>
                          </DesignPreviewDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function EntitlementsSkeleton() {
  return <Skeleton className="h-96 rounded-card" aria-busy="true" />;
}
