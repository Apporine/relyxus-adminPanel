import { CircleAlert, Link2, ShieldPlus } from "lucide-react";
import Link from "next/link";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { lifecycleStage } from "@/domain/status";
import { onboardingProgress } from "@/domain/success";
import type { LifecycleStage, RiskEntry } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatDate, plural } from "@/lib/format";
import { loadSuccess } from "./load";

const severityTone: Record<RiskEntry["severity"], "critical" | "risk" | "neutral"> = {
  high: "critical",
  medium: "risk",
  low: "neutral",
};
const statusLabel: Record<RiskEntry["status"], string> = {
  open: "Open",
  mitigating: "Mitigating",
  accepted: "Accepted",
  closed: "Closed",
};
const severityRank = { high: 0, medium: 1, low: 2 };

/** Risk register: owned customer risks with mitigation and due date. */
export async function RiskRegister() {
  const data = await loadSuccess();
  const rows = [...data.risks].sort(
    (a, b) =>
      Number(a.status === "closed") - Number(b.status === "closed") ||
      severityRank[a.severity] - severityRank[b.severity] ||
      a.dueAt.localeCompare(b.dueAt),
  );
  const open = rows.filter((r) => r.status === "open" || r.status === "mitigating");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-fg-secondary" aria-live="polite">
          {plural(open.length, "open risk")} ·{" "}
          {plural(open.filter((r) => r.severity === "high").length, "high severity risk")}
        </p>
        <DesignPreviewDialog
          trigger="Raise risk"
          triggerVariant="primary"
          triggerIcon={<ShieldPlus aria-hidden="true" />}
          title="Raise risk"
          description="Record a customer risk with an owner, mitigation and due date. It appears on the customer's health page."
          confirmLabel="Raise risk"
        >
          <Field>
            <Label htmlFor="risk-customer">Customer</Label>
            <Select id="risk-customer" name="customer" required defaultValue="">
              <option value="" disabled>
                Choose a customer
              </option>
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="risk-title">Risk</Label>
            <Input id="risk-title" name="title" required />
          </Field>
          <Field>
            <Label htmlFor="risk-mitigation">Mitigation</Label>
            <Textarea id="risk-mitigation" name="mitigation" required />
          </Field>
        </DesignPreviewDialog>
      </div>
      <Card>
        <Table label="Risk register">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Risk</TableHeaderCell>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Severity</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Due</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((risk) => {
              const overdue =
                risk.status !== "closed" &&
                risk.status !== "accepted" &&
                Date.parse(risk.dueAt) < Date.parse(data.now);
              return (
                <TableRow key={risk.id}>
                  <TableCell className="min-w-72">
                    <span className="font-medium text-fg">{risk.title}</span>
                    <span className="block text-micro text-fg-muted">{risk.mitigation}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Link
                      href={`/success/health/${risk.customerId}`}
                      className="hover:text-violet-text hover:underline"
                    >
                      {data.customerById[risk.customerId]?.displayName}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{risk.category}</TableCell>
                  <TableCell>
                    <StatusBadge
                      tone={severityTone[risk.severity]}
                      label={risk.severity[0]!.toUpperCase() + risk.severity.slice(1)}
                    />
                  </TableCell>
                  <TableCell>{statusLabel[risk.status]}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {data.staff[risk.ownerId]?.name}
                  </TableCell>
                  <TableCell
                    className={cn("whitespace-nowrap", overdue && "font-medium text-coral-text")}
                  >
                    {formatDate(risk.dueAt)}
                    {overdue ? " · overdue" : ""}
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

const boardStages: LifecycleStage[] = [
  "commercial_handoff",
  "security_review",
  "architecture_discovery",
  "pilot_ready",
  "deployment_ready",
  "go_live",
];

/**
 * Onboarding board (spec §11): customers by lifecycle stage with checklist progress,
 * overdue and blocked items. Checklist completion never marks a deployment supported.
 */
export async function OnboardingBoard() {
  const data = await loadSuccess();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-dense text-fg-muted">
        Completing a checklist never marks a deployment supported; that needs the technical
        conformance gates.
      </p>
      <div className="grid scroll-fade-x auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-1">
        {boardStages.map((stage) => {
          const customers = data.customers.filter((c) => c.lifecycleStage === stage);
          return (
            <section
              key={stage}
              aria-labelledby={`stage-${stage}`}
              className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface-sunken/60 p-3"
            >
              <h2 id={`stage-${stage}`} className="flex items-baseline justify-between px-1">
                <span className="text-card-title text-fg">{lifecycleStage[stage]}</span>
                <span className="text-micro text-fg-muted tabular">{customers.length}</span>
              </h2>
              {customers.length === 0 ? (
                <p className="rounded-control border border-dashed border-border-strong px-3 py-5 text-center text-micro text-fg-muted">
                  No customers
                </p>
              ) : (
                <ul className="flex stagger flex-col gap-2">
                  {customers.map((customer) => {
                    const p = onboardingProgress(customer.id, data.onboarding, data.now);
                    const items = data.onboarding.filter((i) => i.customerId === customer.id);
                    return (
                      <li key={customer.id}>
                        <article
                          aria-labelledby={`onb-${customer.id}`}
                          className={cn(
                            "rounded-card border bg-surface p-3 shadow-card transition-[transform,box-shadow] duration-(--ap-duration-panel) hover:-translate-y-0.5 hover:shadow-lift",
                            p.overdue.length ? "border-coral/50" : "border-border",
                          )}
                        >
                          <h3 id={`onb-${customer.id}`} className="text-body font-semibold">
                            <Link
                              href={`/customers/${customer.id}?tab=success`}
                              className="text-fg hover:text-violet-text hover:underline"
                            >
                              {customer.displayName}
                            </Link>
                          </h3>
                          <div className="mt-2 flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken"
                            >
                              <span
                                className="block h-full chart-grow-x rounded-full bg-linear-to-r from-violet to-cyan"
                                style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }}
                              />
                            </span>
                            <span className="text-micro text-fg-secondary tabular">
                              {p.done} of {p.total} done
                            </span>
                          </div>
                          {items.length ? (
                            <ul className="mt-2 flex flex-col gap-1">
                              {items.map((i) => {
                                const late =
                                  i.status !== "done" && Date.parse(i.dueAt) < Date.parse(data.now);
                                return (
                                  <li key={i.id} className="text-micro">
                                    <span
                                      className={cn(
                                        i.status === "done"
                                          ? "text-fg-muted line-through"
                                          : "text-fg",
                                      )}
                                    >
                                      {i.title}
                                    </span>
                                    <span
                                      className={cn(
                                        "block",
                                        late || i.status === "blocked"
                                          ? "font-medium text-coral-text"
                                          : "text-fg-muted",
                                      )}
                                    >
                                      {data.staff[i.ownerId]?.name} · {formatDate(i.dueAt)}
                                      {i.status === "blocked"
                                        ? " · blocked"
                                        : late
                                          ? " · overdue"
                                          : ""}
                                    </span>
                                    {i.evidenceRef ? (
                                      <span className="inline-flex items-center gap-1 text-fg-muted">
                                        <Link2 aria-hidden="true" className="size-3" />
                                        {i.evidenceRef}
                                      </span>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="mt-2 text-micro text-fg-muted">No checklist yet</p>
                          )}
                          {p.overdue.length || p.blocked.length ? (
                            <p className="mt-2 inline-flex items-center gap-1 text-micro font-medium text-coral-text">
                              <CircleAlert aria-hidden="true" className="size-3.5" />
                              {[
                                p.overdue.length ? plural(p.overdue.length, "overdue item") : "",
                                p.blocked.length ? `${p.blocked.length} blocked` : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </article>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <p className="text-micro text-fg-muted">
        <Tag>Template</Tag> Checklists vary by product and deployment model.
      </p>
    </div>
  );
}
