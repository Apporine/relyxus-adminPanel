import { CalendarPlus, CheckCircle2, Circle, Lock, Target } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/description-list";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Field, Input, Label } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import type { SuccessGoal, SuccessMilestone } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { getCurrentStaff, getQbr } from "@/server/data";
import { loadSuccess } from "./load";

const goalTone: Record<
  SuccessGoal["status"],
  { label: string; tone: "healthy" | "risk" | "info" }
> = {
  achieved: { label: "Achieved", tone: "healthy" },
  on_track: { label: "On track", tone: "info" },
  at_risk: { label: "At risk", tone: "risk" },
};

const milestoneLabel: Record<SuccessMilestone["status"], string> = {
  done: "Done",
  in_progress: "In progress",
  not_started: "Not started",
  overdue: "Overdue",
};

/** Success plan (spec §20): goals, milestones, outcomes, owner, due date and evidence. */
export async function SuccessPlan({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const data = await loadSuccess();
  const customer = data.customerById[customerId];
  if (!customer) notFound();
  const goals = data.goals.filter((g) => g.customerId === customerId);
  const milestones = data.milestones.filter((m) => m.customerId === customerId);
  const qbrs = data.qbrs.filter((q) => q.customerId === customerId);
  const done = milestones.filter((m) => m.status === "done").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Success", href: "/success" },
            { label: customer.displayName, href: `/success/health/${customer.id}` },
            { label: "Success plan" },
          ]}
        />
        <PageHeader
          title={`${customer.displayName} success plan`}
          description={`${done} of ${milestones.length} milestones done`}
          actions={
            <DesignPreviewDialog
              trigger="Add milestone"
              triggerVariant="primary"
              triggerIcon={<CalendarPlus aria-hidden="true" />}
              title="Add milestone"
              description="Add a milestone with an owner, due date and the evidence that will show it is done."
              confirmLabel="Add milestone"
            >
              <Field>
                <Label htmlFor="milestone-title">Milestone</Label>
                <Input id="milestone-title" name="title" required />
              </Field>
              <Field>
                <Label htmlFor="milestone-due">Due date</Label>
                <Input id="milestone-due" name="due" type="date" required />
              </Field>
            </DesignPreviewDialog>
          }
        />
      </div>

      {goals.length === 0 && milestones.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No success plan yet"
          body="Agree goals and milestones with the customer and record them here."
          className="rounded-card border border-dashed border-border-strong bg-surface"
        />
      ) : null}

      {goals.length ? (
        <section aria-labelledby="goals-title">
          <h2 id="goals-title" className="mb-3 text-section-title text-fg">
            Goals
          </h2>
          <ul className="grid stagger gap-3 lg:grid-cols-2">
            {goals.map((goal) => (
              <li
                key={goal.id}
                className="rounded-card border border-border bg-surface p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-fg">{goal.title}</p>
                  <StatusBadge
                    tone={goalTone[goal.status].tone}
                    label={goalTone[goal.status].label}
                  />
                </div>
                <DescriptionList
                  className="mt-3"
                  columns={2}
                  items={[
                    { term: "Outcome", value: goal.outcome },
                    { term: "Measure", value: goal.measure },
                    { term: "Owner", value: data.staff[goal.ownerId]?.name },
                  ]}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {milestones.length ? (
        <Card aria-labelledby="milestones-title">
          <CardHeader>
            <CardTitle id="milestones-title">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {milestones.map((m) => (
                <li key={m.title} className="flex items-start gap-3">
                  {m.status === "done" ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-cyan-text"
                    />
                  ) : (
                    <Circle
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        m.status === "overdue" ? "text-coral-text" : "text-fg-muted",
                      )}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-fg">{m.title}</p>
                    <p className="text-micro text-fg-muted">
                      {data.staff[m.ownerId]?.name} · due {formatDate(m.dueAt)}
                      {m.evidenceRef ? ` · evidence ${m.evidenceRef}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-micro font-medium",
                      m.status === "overdue" ? "text-coral-text" : "text-fg-secondary",
                    )}
                  >
                    {milestoneLabel[m.status]}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {qbrs.length ? (
        <Card aria-labelledby="plan-qbrs">
          <CardHeader>
            <CardTitle id="plan-qbrs">Business reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {qbrs.map((q) => (
                <li key={q.id}>
                  <Link href={`/success/qbrs/${q.id}`} className="text-violet-text hover:underline">
                    Review on {formatDate(q.heldAt)}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/** QBR records across customers, newest first. */
export async function QbrList() {
  const data = await loadSuccess();
  const rows = [...data.qbrs].sort((a, b) => b.heldAt.localeCompare(a.heldAt));
  return (
    <Card>
      <Table label="Business reviews" className="whitespace-nowrap">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Held</TableHeaderCell>
            <TableHeaderCell>Customer</TableHeaderCell>
            <TableHeaderCell>Attendees</TableHeaderCell>
            <TableHeaderCell>Open commitments</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((q) => (
            <TableRow key={q.id}>
              <TableCell>
                <Link
                  href={`/success/qbrs/${q.id}`}
                  className="font-medium text-fg hover:text-violet-text hover:underline"
                >
                  {formatDate(q.heldAt)}
                </Link>
              </TableCell>
              <TableCell>{data.customerById[q.customerId]?.displayName}</TableCell>
              <TableCell className="tabular">{q.attendees.length}</TableCell>
              <TableCell className="tabular">
                {q.commitments.filter((c) => c.status === "open").length}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/** QBR record (spec §20). Sensitive notes need a customer success or executive role. */
export async function QbrDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qbr = await getQbr(id);
  if (!qbr) notFound();
  const [data, me] = await Promise.all([loadSuccess(), getCurrentStaff()]);
  const customer = data.customerById[qbr.customerId];
  const canReadSensitive = me.roles.some(
    (r) => r === "customer_success" || r === "executive_viewer",
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Success", href: "/success" },
            { label: "QBRs", href: "/success/qbrs" },
            { label: formatDate(qbr.heldAt) },
          ]}
        />
        <PageHeader
          title={`${customer?.displayName ?? qbr.customerId} business review`}
          description={`Held ${formatDate(qbr.heldAt)}`}
        />
      </div>
      <div className="grid stagger items-start gap-4 lg:grid-cols-2">
        <Card aria-labelledby="qbr-summary">
          <CardHeader>
            <CardTitle id="qbr-summary">Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-body text-fg">{qbr.summary}</p>
            <div>
              <p className="text-micro font-medium text-fg-muted">Attendees</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {qbr.attendees.map((a) => (
                  <li key={a.name}>
                    <Tag
                      className={a.side === "apporine" ? "bg-violet-subtle text-violet-text" : ""}
                    >
                      {a.name} · {a.side === "apporine" ? "Apporine" : "Customer"}
                    </Tag>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
        <Card aria-labelledby="qbr-commitments">
          <CardHeader>
            <CardTitle id="qbr-commitments">Commitments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {qbr.commitments.map((c) => (
                <li key={c.text} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body text-fg">{c.text}</p>
                    <p className="text-micro text-fg-muted">
                      {data.staff[c.ownerId]?.name} · due {formatDate(c.dueAt)}
                    </p>
                  </div>
                  <StatusBadge
                    tone={c.status === "done" ? "healthy" : "neutral"}
                    label={c.status === "done" ? "Done" : "Open"}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card aria-labelledby="qbr-next">
          <CardHeader>
            <CardTitle id="qbr-next">Next actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-1 ps-5 text-body text-fg-secondary">
              {qbr.nextActions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card aria-labelledby="qbr-notes">
          <CardHeader>
            <CardTitle id="qbr-notes">Sensitive notes</CardTitle>
          </CardHeader>
          <CardContent>
            {!qbr.sensitiveNotes ? (
              <p className="text-body text-fg-muted">None recorded.</p>
            ) : canReadSensitive ? (
              <p className="text-body text-fg">{qbr.sensitiveNotes}</p>
            ) : (
              <Notice title="Restricted">
                <span className="inline-flex items-center gap-1.5">
                  <Lock aria-hidden="true" className="size-3.5" />
                  Visible to customer success and executive roles only.
                </span>
              </Notice>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
