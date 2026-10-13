import {
  Download,
  RefreshCw,
  Repeat2,
  ShieldCheck,
  ShieldOff,
  ShieldX,
  Unplug,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableId } from "@/components/ui/copyable-id";
import { DescriptionList } from "@/components/ui/description-list";
import { Notice, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { licenseActionPolicy, type LicenseAction } from "@/domain/license-actions";
import { allowanceUsage, graceEndsAt, riskReasonLabel } from "@/domain/licensing";
import { approvalType, licenseState } from "@/domain/status";
import { cn } from "@/lib/cn";
import { formatDate, formatRelativeDays, formatTimestamp } from "@/lib/format";
import { LicenseTabPanel, LicenseTabs, parseLicenseTab } from "./license-tabs";
import { loadLicense, type LicenseDetailData } from "./load";

const actionIcons: Record<Exclude<LicenseAction, "issue">, typeof RefreshCw> = {
  renew: RefreshCw,
  replace: Repeat2,
  rebind: Unplug,
  suspend: ShieldOff,
  revoke: ShieldX,
};

/** License detail (spec §15, §30.1): what was signed, why, when, by whom and where it is used. */
export async function LicenseDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const data = await loadLicense(id, query.rev);
  if (!data) notFound();
  const tab = parseLicenseTab(query.tab);
  const { license, customer, product } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Licensing", href: "/licensing" },
            ...(customer
              ? [{ label: customer.displayName, href: `/customers/${customer.id}?tab=licenses` }]
              : []),
            { label: license.id },
          ]}
        />
        <PageHeader
          title={license.id}
          description={`${product?.name ?? license.productId} license for ${customer?.displayName ?? license.customerId}`}
          meta={
            <>
              <StatusBadge
                tone={licenseState[license.state].tone}
                label={licenseState[license.state].label}
              />
              <Tag>Revision {data.latest.revision} current</Tag>
              {data.risks
                .filter((r) => r === "expiring" || r === "drift")
                .map((r) => (
                  <Tag key={r} className="bg-coral-subtle text-coral-text">
                    {riskReasonLabel[r]}
                  </Tag>
                ))}
            </>
          }
          actions={<LicenseActions data={data} />}
        />
      </div>

      <UnavailableActions data={data} />
      <StateNotices data={data} />

      <div className="grid gap-4 lg:grid-cols-3">
        <ExpiryTimeline data={data} />
        <BindingSummary data={data} />
        <Card aria-labelledby="license-source">
          <CardHeader>
            <CardTitle id="license-source">Commercial source</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList
              items={[
                {
                  term: "Customer",
                  value: customer && (
                    <Link
                      href={`/customers/${customer.id}`}
                      className="text-violet-text hover:underline"
                    >
                      {customer.displayName}
                    </Link>
                  ),
                },
                { term: "Source contract", value: data.contract?.number },
                {
                  term: "Grace policy",
                  value: `${license.graceDays} days after expiry, then expired`,
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
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <RevisionSelector data={data} tab={tab} />
      <section aria-label="License sections" className="flex flex-col gap-4">
        <LicenseTabs
          licenseId={license.id}
          active={tab}
          revision={data.isLatest ? undefined : data.revision.revision}
        />
        <LicenseTabPanel tab={tab} data={data} />
      </section>
    </div>
  );
}

function LicenseActions({ data }: { data: LicenseDetailData }) {
  const { license } = data;
  const order: Array<Exclude<LicenseAction, "issue">> = [
    "replace",
    "rebind",
    "suspend",
    "revoke",
    "renew",
  ];
  return (
    <>
      <DesignPreviewDialog
        trigger="Download artifact"
        triggerIcon={<Download aria-hidden="true" />}
        title="Download license artifact"
        description="Downloads the signed artifact for the current revision. The download is recorded in audit; deliver it only through an approved channel."
        confirmLabel="Download artifact"
      />
      <Button asChild>
        <Link href={`/licensing/verify?license=${license.id}`}>
          <ShieldCheck aria-hidden="true" />
          Verify artifact
        </Link>
      </Button>
      {order.map((action) => {
        const Icon = actionIcons[action];
        const policy = licenseActionPolicy[action];
        const availability = data.availability[action];
        const variant = action === "renew" ? "primary" : "secondary";
        return availability.allowed ? (
          <Button key={action} asChild variant={variant}>
            <Link href={`/licensing/${license.id}/${action}`}>
              <Icon aria-hidden="true" />
              {policy.label}
            </Link>
          </Button>
        ) : (
          <Button key={action} variant={variant} disabled aria-describedby="unavailable-actions">
            <Icon aria-hidden="true" />
            {policy.label}
          </Button>
        );
      })}
    </>
  );
}

/** Disabled actions always state why in text, never only on hover (spec §32). */
function UnavailableActions({ data }: { data: LicenseDetailData }) {
  const blocked = Object.entries(data.availability).filter(([, a]) => !a.allowed) as Array<
    [Exclude<LicenseAction, "issue">, { allowed: false; reason: string }]
  >;
  if (blocked.length === 0) return null;
  const byReason = new Map<string, string[]>();
  for (const [action, a] of blocked)
    byReason.set(a.reason, [...(byReason.get(a.reason) ?? []), licenseActionPolicy[action].label]);
  return (
    <ul id="unavailable-actions" className="flex flex-col gap-0.5 text-dense text-fg-muted">
      {[...byReason.entries()].map(([reason, labels]) => (
        <li key={reason}>
          <span className="font-medium text-fg-secondary">{labels.join(", ")}</span> unavailable:{" "}
          {reason}
        </li>
      ))}
    </ul>
  );
}

function StateNotices({ data }: { data: LicenseDetailData }) {
  const { license, now } = data;
  return (
    <>
      {data.pending.map((request) => (
        <Notice key={request.id} title={`${approvalType[request.type]} awaiting approval`}>
          <Link href={`/approvals/${request.id}`} className="font-medium text-fg underline">
            {request.id}
          </Link>{" "}
          · requested by {data.staff[request.requesterId]?.name}{" "}
          {formatRelativeDays(request.createdAt, now)} · expires{" "}
          {formatTimestamp(request.expiresAt)}
        </Notice>
      ))}
      {license.state === "grace" ? (
        <Notice tone="risk" title="In grace period">
          Expired {formatDate(license.expiresAt)}. Installed products keep working under the cached
          signed license until {formatDate(graceEndsAt(license))} (
          {formatRelativeDays(graceEndsAt(license), now)}). Renew before then.
        </Notice>
      ) : null}
      {license.state === "verification_failed" ? (
        <Notice tone="critical" title="Verification failed">
          The last verification signal on{" "}
          {license.lastVerificationAt
            ? formatTimestamp(license.lastVerificationAt)
            : "an unknown date"}{" "}
          did not match this license. Review deployment bindings; the license is not changed
          automatically.
        </Notice>
      ) : null}
      {!data.isLatest ? (
        <Notice title={`Viewing superseded revision ${data.revision.revision}`}>
          Signed revisions are immutable. This revision was replaced by revision{" "}
          {data.latest.revision}.{" "}
          <Link href={`/licensing/${license.id}`} className="font-medium text-fg underline">
            View the current revision
          </Link>
        </Notice>
      ) : null}
    </>
  );
}

function ExpiryTimeline({ data }: { data: LicenseDetailData }) {
  const { license, now } = data;
  const start = Date.parse(license.validFrom);
  const expiry = Date.parse(license.expiresAt);
  const grace = Date.parse(graceEndsAt(license));
  const span = grace - start;
  const pos = (t: number) => `${Math.min(100, Math.max(0, ((t - start) / span) * 100))}%`;
  const nowT = Date.parse(now);
  return (
    <Card aria-labelledby="license-expiry">
      <CardHeader>
        <div>
          <CardTitle id="license-expiry">Validity</CardTitle>
          <CardDescription>
            Expires {formatDate(license.expiresAt)}, {formatRelativeDays(license.expiresAt, now)}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div aria-hidden="true" className="relative mt-6 h-2 rounded-full bg-surface-sunken">
          <div
            className="absolute inset-y-0 start-0 rounded-s-full bg-violet"
            style={{ width: pos(expiry) }}
          />
          <div
            className="absolute inset-y-0 bg-coral/60"
            style={{ insetInlineStart: pos(expiry), width: `calc(${pos(grace)} - ${pos(expiry)})` }}
          />
          <div
            className="absolute -top-5 -translate-x-1/2 text-micro font-semibold text-fg"
            style={{ insetInlineStart: pos(nowT) }}
          >
            Today
          </div>
          <div
            className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 bg-ink"
            style={{ insetInlineStart: pos(nowT) }}
          />
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-micro">
          <div>
            <dt className="text-fg-muted">Valid from</dt>
            <dd className="text-fg">{formatDate(license.validFrom)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Expires</dt>
            <dd className="text-fg">{formatDate(license.expiresAt)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Grace ends</dt>
            <dd className="text-fg">{formatDate(graceEndsAt(license))}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function BindingSummary({ data }: { data: LicenseDetailData }) {
  const usage = allowanceUsage(
    data.license,
    data.bindings.map((b) => b.deployment),
  );
  const mismatched = data.bindings.filter((b) => b.match === "mismatch").length;
  return (
    <Card aria-labelledby="license-bindings">
      <CardHeader>
        <div>
          <CardTitle id="license-bindings">Deployment bindings</CardTitle>
          <CardDescription>Production and DR count toward the allowance</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p
          className={cn(
            "text-section-title tabular",
            usage.exceeded ? "text-coral-text" : "text-fg",
          )}
        >
          {usage.used} of {usage.allowed} used
        </p>
        <div
          role="meter"
          aria-label="Deployment allowance used"
          aria-valuemin={0}
          aria-valuemax={usage.allowed}
          aria-valuenow={usage.used}
          className="h-2 rounded-full bg-violet-subtle"
        >
          <div
            className={cn("h-full rounded-full", usage.exceeded ? "bg-coral" : "bg-violet")}
            style={{ width: `${Math.min(100, (usage.used / Math.max(1, usage.allowed)) * 100)}%` }}
          />
        </div>
        <p className="text-dense text-fg-secondary">
          {data.bindings.length} bound ·{" "}
          {mismatched ? (
            <span className="font-medium text-coral-text">{mismatched} mismatched</span>
          ) : (
            "all metadata matches"
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function RevisionSelector({ data, tab }: { data: LicenseDetailData; tab: string }) {
  const revisions = [...data.license.revisions].reverse();
  return (
    <nav aria-label="Revisions" className="flex flex-wrap items-center gap-2">
      <span className="text-micro font-semibold text-fg-muted">Immutable revisions</span>
      {revisions.map((r) => {
        const current = r.revision === data.revision.revision;
        const latest = r.revision === data.latest.revision;
        return (
          <Link
            key={r.revision}
            href={`/licensing/${data.license.id}?tab=${tab}${latest ? "" : `&rev=${r.revision}`}`}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-dense",
              current
                ? "border-violet bg-violet-subtle font-medium text-fg"
                : "border-border-strong text-fg-secondary hover:bg-surface-hover",
            )}
          >
            Revision {r.revision}
            <span className="text-micro text-fg-muted">
              {latest ? "current" : formatDate(r.issuedAt)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function LicenseDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading license" className="flex flex-col gap-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
