import { ClipboardCheck, ListChecks } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/description-list";
import { Notice } from "@/components/ui/feedback";
import { Field, FieldHint, Input, Label, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { reviewProgress, reviewStatus, unusedRoles } from "@/domain/security";
import { roleName } from "@/domain/status";
import type { StaffUser } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatDate, formatRelativeDays, formatRelativeTime } from "@/lib/format";
import { getAccessReview } from "@/server/data";
import { loadSecurity } from "./load";
import { dispositionLabel, Progress, reviewStatusLabel, Status } from "./security-parts";

/** Start access review dialog with the spec §31 title, message and button label. */
export function StartAccessReview({
  staff,
  defaultDue,
}: {
  staff: StaffUser[];
  /** ISO date (yyyy-mm-dd) suggested as the due date. */
  defaultDue: string;
}) {
  return (
    <DesignPreviewDialog
      trigger="Start review"
      triggerVariant="primary"
      triggerIcon={<ListChecks aria-hidden="true" />}
      title="Start access review"
      description="Choose the reviewer scope and due date. Existing access remains unchanged until review decisions are applied."
      confirmLabel="Start review"
    >
      <Field>
        <Label htmlFor="review-scope">Scope</Label>
        <Select id="review-scope" name="scope" defaultValue="privileged">
          <option value="privileged">Privileged roles across all products</option>
          <option value="all">All staff and roles</option>
          <option value="temporary">Temporary grants and break glass</option>
          <option value="dormant">Dormant accounts and unused roles</option>
        </Select>
      </Field>
      <Field>
        <Label htmlFor="review-reviewer">Reviewer</Label>
        <Select id="review-reviewer" name="reviewer" required defaultValue="">
          <option value="" disabled>
            Choose a reviewer
          </option>
          {staff
            .filter((s) => s.roles.includes("security_admin") || s.roles.includes("auditor"))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </Select>
        <FieldHint>
          Reviewers never decide their own access; those items go to a second reviewer.
        </FieldHint>
      </Field>
      <Field>
        <Label htmlFor="review-due">Due date</Label>
        <Input id="review-due" name="due" type="date" required defaultValue={defaultDue} />
      </Field>
    </DesignPreviewDialog>
  );
}

const plusDays = (iso: string, days: number) =>
  new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);

/** Access review campaigns with reviewer, due date and decision progress (spec §23). */
export async function AccessReviewList() {
  const data = await loadSecurity();
  const rows = [...data.reviews].sort(
    (a, b) =>
      Number(Boolean(a.closedAt)) - Number(Boolean(b.closedAt)) || a.dueAt.localeCompare(b.dueAt),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-fg-secondary">
          Decisions change nothing until they are applied; applying removals is a governed action.
        </p>
        <StartAccessReview staff={data.staff} defaultDue={plusDays(data.now, 21)} />
      </div>
      <Card>
        <Table label="Access reviews" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Campaign</TableHeaderCell>
              <TableHeaderCell>Reviewer</TableHeaderCell>
              <TableHeaderCell>Started</TableHeaderCell>
              <TableHeaderCell>Due</TableHeaderCell>
              <TableHeaderCell>Progress</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => {
              const p = reviewProgress(r);
              const status = reviewStatus(r, data.now);
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/security/access-reviews/${r.id}`}
                      className="font-medium text-fg hover:text-violet-text hover:underline"
                    >
                      {r.title}
                    </Link>
                    <span className="block text-micro text-fg-muted">{r.scope}</span>
                  </TableCell>
                  <TableCell>{data.directory[r.reviewerId]?.name}</TableCell>
                  <TableCell>{formatDate(r.startedAt)}</TableCell>
                  <TableCell className={cn(status === "overdue" && "font-medium text-coral-text")}>
                    {formatDate(r.dueAt)}
                    {r.closedAt ? null : (
                      <span className="block text-micro">
                        {formatRelativeDays(r.dueAt, data.now)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Progress
                      done={p.decided}
                      total={p.total}
                      label="decided"
                      risk={status === "overdue"}
                    />
                  </TableCell>
                  <TableCell>
                    <Status value={reviewStatusLabel[status]} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/** One campaign: each role assignment with last use and the reviewer's disposition. */
export async function AccessReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [review, data] = await Promise.all([getAccessReview(id), loadSecurity()]);
  if (!review) notFound();
  const p = reviewProgress(review);
  const status = reviewStatus(review, data.now);
  const removals = review.items.filter(
    (i) => i.disposition === "remove" || i.disposition === "reduce",
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Security", href: "/security" },
            { label: "Access reviews", href: "/security/access-reviews" },
            { label: review.title },
          ]}
        />
        <PageHeader
          title={review.title}
          description={review.scope}
          meta={<Status value={reviewStatusLabel[status]} />}
          actions={
            review.closedAt ? null : (
              <DesignPreviewDialog
                trigger="Apply decisions"
                triggerVariant="primary"
                triggerIcon={<ClipboardCheck aria-hidden="true" />}
                title="Apply access review decisions"
                description="Kept roles are confirmed. Removals and reductions become governed requests and need approval before access changes."
                confirmLabel="Apply decisions"
              >
                {p.pending ? (
                  <Notice tone="risk" title={`${p.pending} decisions are still pending`}>
                    Pending items stay unchanged and keep the campaign open.
                  </Notice>
                ) : null}
                <p className="text-body text-fg-secondary">
                  {removals.length
                    ? `${removals.length} removal or reduction requests will be created.`
                    : "No removals or reductions to apply."}
                </p>
              </DesignPreviewDialog>
            )
          }
        />
      </div>

      {status === "overdue" ? (
        <Notice tone="critical" title="Review overdue">
          Due {formatDate(review.dueAt)}. {p.pending} decisions are outstanding; existing access
          stays unchanged until they are made.
        </Notice>
      ) : null}

      <Card aria-labelledby="review-summary-title">
        <CardHeader>
          <CardTitle id="review-summary-title">Campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <DescriptionList
            columns={2}
            items={[
              { term: "Reviewer", value: data.directory[review.reviewerId]?.name },
              { term: "Started", value: formatDate(review.startedAt) },
              { term: "Due", value: formatDate(review.dueAt) },
              { term: "Closed", value: review.closedAt ? formatDate(review.closedAt) : "Open" },
              {
                term: "Progress",
                value: <Progress done={p.decided} total={p.total} label="decided" />,
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <Table label="Role assignments under review" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Staff</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Last used</TableHeaderCell>
              <TableHeaderCell>Disposition</TableHeaderCell>
              <TableHeaderCell>Decided by</TableHeaderCell>
              <TableHeaderCell>Note</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {review.items.map((item) => {
              const person = data.directory[item.staffId];
              const access = data.accessById[item.staffId];
              const last = access?.roleLastUsedAt[item.role];
              const unused = person
                ? unusedRoles(person, access, data.now).includes(item.role)
                : false;
              return (
                <TableRow key={`${item.staffId}-${item.role}`}>
                  <TableCell>
                    <Link
                      href={`/security/staff?person=${item.staffId}`}
                      className="font-medium text-fg hover:text-violet-text hover:underline"
                    >
                      {person?.name}
                    </Link>
                    <span className="block text-micro text-fg-muted">{person?.title}</span>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/security/roles/${item.role}`}
                      className="hover:text-violet-text hover:underline"
                    >
                      {roleName[item.role]}
                    </Link>
                  </TableCell>
                  <TableCell className={cn(unused && "font-medium text-coral-text")}>
                    {last ? formatRelativeTime(last, data.now) : "Never used"}
                  </TableCell>
                  <TableCell>
                    <Status value={dispositionLabel[item.disposition]} />
                  </TableCell>
                  <TableCell>
                    {item.decidedById ? data.directory[item.decidedById]?.name : "—"}
                  </TableCell>
                  <TableCell className="min-w-64 whitespace-normal text-fg-muted">
                    {item.note ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/** Posture page actions: open the main registers and start an access review (spec §30). */
export async function PostureActions() {
  const data = await loadSecurity();
  return (
    <>
      <Button asChild>
        <Link href="/security/staff">Open staff</Link>
      </Button>
      <Button asChild>
        <Link href="/security/api-clients">Open API clients</Link>
      </Button>
      <Button asChild>
        <Link href="/security/signing-keys">Open signing keys</Link>
      </Button>
      <StartAccessReview staff={data.staff} defaultDue={plusDays(data.now, 21)} />
    </>
  );
}
