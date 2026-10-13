import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableId } from "@/components/ui/copyable-id";
import { DescriptionList } from "@/components/ui/description-list";
import { EmptyState } from "@/components/ui/feedback";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { diffRevisions } from "@/domain/licensing";
import { deploymentEnvironment } from "@/domain/status";
import type { ChangeLine } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatRelativeTime, formatTimestamp } from "@/lib/format";
import type { LicenseDetailData } from "./load";

export const licenseTabs = [
  { id: "entitlements", label: "Entitlements" },
  { id: "deployments", label: "Deployments" },
  { id: "revisions", label: "Revisions" },
  { id: "delivery", label: "Delivery" },
  { id: "audit", label: "Audit" },
] as const;

export type LicenseTabId = (typeof licenseTabs)[number]["id"];

export function parseLicenseTab(value: string | string[] | undefined): LicenseTabId {
  const raw = Array.isArray(value) ? value[0] : value;
  return licenseTabs.find((t) => t.id === raw)?.id ?? "entitlements";
}

export function LicenseTabs({
  licenseId,
  active,
  revision,
}: {
  licenseId: string;
  active: LicenseTabId;
  revision?: number;
}) {
  return (
    <nav aria-label="License sections" className="border-b border-border">
      <ul className="-mb-px flex flex-wrap gap-x-1">
        {licenseTabs.map((tab) => (
          <li key={tab.id}>
            <Link
              href={`/licensing/${licenseId}?tab=${tab.id}${revision ? `&rev=${revision}` : ""}`}
              aria-current={tab.id === active ? "page" : undefined}
              scroll={false}
              className="inline-flex h-10 items-center border-b-2 border-transparent px-2.5 text-body font-medium text-fg-muted hover:text-fg aria-[current=page]:border-violet aria-[current=page]:text-fg"
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Structured before and after diff; no decorative chart (spec §30.1 approval detail). */
export function DiffTable({ label, lines }: { label: string; lines: ChangeLine[] }) {
  return (
    <Table label={label}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Field</TableHeaderCell>
          <TableHeaderCell>Before</TableHeaderCell>
          <TableHeaderCell>After</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={line.field}>
            <TableCell className="text-fg">{line.field}</TableCell>
            <TableCell>
              <del className="text-fg-muted decoration-coral">{line.before}</del>
            </TableCell>
            <TableCell>
              <ins
                className={cn(
                  "font-medium text-fg no-underline",
                  line.before !== line.after && "bg-violet-subtle px-1",
                )}
              >
                {line.after}
              </ins>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EntitlementsTab({ data }: { data: LicenseDetailData }) {
  const changes = diffRevisions(data.previous, data.revision);
  const proposal = data.pending[0];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card aria-labelledby="signed-payload">
        <CardHeader>
          <div>
            <CardTitle id="signed-payload">
              Signed entitlements, revision {data.revision.revision}
            </CardTitle>
            <CardDescription>
              The signed payload in human form. It cannot be edited; changes create a new revision.
            </CardDescription>
          </div>
        </CardHeader>
        <Table label={`Signed entitlements, revision ${data.revision.revision}`}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Entitlement</TableHeaderCell>
              <TableHeaderCell>Machine key</TableHeaderCell>
              <TableHeaderCell>Value</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.revision.entitlements.map((e) => (
              <TableRow key={e.key}>
                <TableCell className="text-fg">{e.label}</TableCell>
                <TableCell>
                  <code className="font-mono text-micro">{e.key}</code>
                </TableCell>
                <TableCell className="font-medium text-fg">{e.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <CardContent>
          <DescriptionList
            columns={2}
            items={[
              {
                term: "Payload hash",
                value: (
                  <CopyableId value={data.revision.payloadHash} label="Payload hash" truncate />
                ),
              },
              {
                term: "Signing key",
                value: <code className="font-mono text-micro">{data.revision.signingKeyId}</code>,
              },
              { term: "Source contract", value: data.contract?.number },
              { term: "Issued", value: formatTimestamp(data.revision.issuedAt) },
            ]}
          />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <Card aria-labelledby="revision-diff">
          <CardHeader>
            <div>
              <CardTitle id="revision-diff">
                {data.previous
                  ? `Changes from revision ${data.previous.revision}`
                  : "Initial revision"}
              </CardTitle>
              <CardDescription>{data.revision.reason}</CardDescription>
            </div>
          </CardHeader>
          {data.previous ? (
            changes.length ? (
              <DiffTable
                label={`Changes from revision ${data.previous.revision}`}
                lines={changes}
              />
            ) : (
              <CardContent className="text-dense text-fg-muted">
                Same rights; artifact replaced.
              </CardContent>
            )
          ) : (
            <CardContent className="text-dense text-fg-muted">
              Issued from the source contract.
            </CardContent>
          )}
        </Card>
        {proposal ? (
          <Card aria-labelledby="proposed-diff">
            <CardHeader>
              <div>
                <CardTitle id="proposed-diff">Proposed in {proposal.id}</CardTitle>
                <CardDescription>
                  Awaiting approval; nothing changes until a new revision is signed.
                </CardDescription>
              </div>
            </CardHeader>
            <DiffTable label={`Proposed changes in ${proposal.id}`} lines={proposal.diff} />
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function DeploymentsTab({ data }: { data: LicenseDetailData }) {
  if (data.bindings.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No deployments bound"
          body="Bind a registered deployment to this license with Rebind deployment."
        />
      </Card>
    );
  }
  return (
    <Card aria-labelledby="bindings-table">
      <CardHeader>
        <CardTitle id="bindings-table">Known deployment bindings</CardTitle>
      </CardHeader>
      <Table label="Deployment bindings" className="whitespace-nowrap">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Deployment</TableHeaderCell>
            <TableHeaderCell>Environment</TableHeaderCell>
            <TableHeaderCell>Region</TableHeaderCell>
            <TableHeaderCell>Release</TableHeaderCell>
            <TableHeaderCell>License match</TableHeaderCell>
            <TableHeaderCell>Allowance</TableHeaderCell>
            <TableHeaderCell>Last check in</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.bindings.map(({ deployment: d, match, countsTowardAllowance }) => (
            <TableRow key={d.id}>
              <TableCell>
                <Link
                  href={`/deployments/${d.id}`}
                  className="font-medium text-fg hover:text-violet-text hover:underline"
                >
                  {d.logicalName}
                </Link>
              </TableCell>
              <TableCell>{deploymentEnvironment[d.environment]}</TableCell>
              <TableCell className="font-mono text-micro">{d.region}</TableCell>
              <TableCell className="font-mono text-micro">{d.releaseVersion}</TableCell>
              <TableCell>
                <StatusBadge
                  tone={match === "match" ? "healthy" : match === "mismatch" ? "risk" : "neutral"}
                  label={
                    match === "match" ? "Matches" : match === "mismatch" ? "Mismatch" : "Unknown"
                  }
                />
              </TableCell>
              <TableCell>{countsTowardAllowance ? "Counts" : "Non-production"}</TableCell>
              <TableCell>
                {d.lastCheckInAt ? (
                  <time dateTime={d.lastCheckInAt} title={formatTimestamp(d.lastCheckInAt)}>
                    {formatRelativeTime(d.lastCheckInAt, data.now)}
                  </time>
                ) : (
                  "Never"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function RevisionsTab({ data }: { data: LicenseDetailData }) {
  const revisions = [...data.license.revisions].reverse();
  return (
    <Card aria-labelledby="revision-history">
      <CardHeader>
        <div>
          <CardTitle id="revision-history">Revision history</CardTitle>
          <CardDescription>
            Immutable. A changed payload always creates a new revision.
          </CardDescription>
        </div>
      </CardHeader>
      <Table label="Revision history" className="whitespace-nowrap">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Revision</TableHeaderCell>
            <TableHeaderCell>Issued</TableHeaderCell>
            <TableHeaderCell>Issuer</TableHeaderCell>
            <TableHeaderCell>Approver</TableHeaderCell>
            <TableHeaderCell>Signing key</TableHeaderCell>
            <TableHeaderCell>Payload hash</TableHeaderCell>
            <TableHeaderCell>Reason</TableHeaderCell>
            <TableHeaderCell>Relationship</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {revisions.map((r, index) => (
            <TableRow
              key={r.revision}
              data-state={r.revision === data.revision.revision ? "selected" : undefined}
            >
              <TableCell className="font-medium text-fg tabular">{r.revision}</TableCell>
              <TableCell>{formatTimestamp(r.issuedAt)}</TableCell>
              <TableCell>{data.staff[r.issuedById]?.name}</TableCell>
              <TableCell>{data.staff[r.approvedById]?.name}</TableCell>
              <TableCell>
                <code className="font-mono text-micro">{r.signingKeyId}</code>
              </TableCell>
              <TableCell>
                <CopyableId
                  value={r.payloadHash}
                  label={`Revision ${r.revision} payload hash`}
                  truncate
                />
              </TableCell>
              <TableCell className="whitespace-normal">{r.reason}</TableCell>
              <TableCell>
                {index === 0 ? (
                  <StatusBadge tone="healthy" label="Current" />
                ) : (
                  `Superseded by ${revisions[index - 1]?.revision}`
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function DeliveryTab({ data }: { data: LicenseDetailData }) {
  const { license } = data;
  const offline = license.deliveryState === "offline_package";
  return (
    <Card aria-labelledby="delivery">
      <CardHeader>
        <div>
          <CardTitle id="delivery">Delivery</CardTitle>
          <CardDescription>
            Licenses are delivered as signed artifacts and never embedded in application images.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <DescriptionList
          columns={2}
          items={[
            {
              term: "Delivery state",
              value: (
                <StatusBadge
                  tone={
                    license.deliveryState === "acknowledged"
                      ? "healthy"
                      : license.deliveryState === "pending"
                        ? "neutral"
                        : "info"
                  }
                  label={license.deliveryState.replaceAll("_", " ")}
                />
              ),
            },
            {
              term: "Channel",
              value: offline ? "Offline package exchange (air gapped)" : "Secure delivery link",
            },
            {
              term: "Artifact fingerprint",
              value: (
                <CopyableId
                  value={license.artifactFingerprint}
                  label="Artifact fingerprint"
                  truncate
                />
              ),
            },
            {
              term: "Last verification signal",
              value: license.lastVerificationAt && formatTimestamp(license.lastVerificationAt),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

function AuditTab({ data }: { data: LicenseDetailData }) {
  if (data.audit.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No audit events match"
          body="Change the time range or filters. Audit visibility may also depend on your role."
        />
      </Card>
    );
  }
  return (
    <Card aria-labelledby="license-audit">
      <CardHeader>
        <CardTitle id="license-audit">License audit</CardTitle>
      </CardHeader>
      <Table label="License audit events" className="whitespace-nowrap">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Timestamp</TableHeaderCell>
            <TableHeaderCell>Actor</TableHeaderCell>
            <TableHeaderCell>Action</TableHeaderCell>
            <TableHeaderCell>Result</TableHeaderCell>
            <TableHeaderCell>Reason</TableHeaderCell>
            <TableHeaderCell>Correlation ID</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.audit.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{formatTimestamp(e.at)}</TableCell>
              <TableCell>{data.staff[e.actorId]?.name}</TableCell>
              <TableCell className="text-fg">{e.actionLabel}</TableCell>
              <TableCell>
                <StatusBadge
                  tone={
                    e.result === "success" ? "healthy" : e.result === "denied" ? "risk" : "critical"
                  }
                  label={
                    e.result === "success" ? "Success" : e.result === "denied" ? "Denied" : "Failed"
                  }
                />
              </TableCell>
              <TableCell className="whitespace-normal">{e.reason ?? "—"}</TableCell>
              <TableCell>
                <CopyableId value={e.correlationId} label="Correlation ID" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

const panels: Record<LicenseTabId, (props: { data: LicenseDetailData }) => React.ReactNode> = {
  entitlements: EntitlementsTab,
  deployments: DeploymentsTab,
  revisions: RevisionsTab,
  delivery: DeliveryTab,
  audit: AuditTab,
};

export function LicenseTabPanel({ tab, data }: { tab: LicenseTabId; data: LicenseDetailData }) {
  const Panel = panels[tab];
  return <Panel data={data} />;
}
