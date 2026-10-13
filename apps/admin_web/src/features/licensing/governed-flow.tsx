"use client";

import { Check, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import {
  Field,
  FieldError,
  FieldHint,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { renewedExpiry } from "@/domain/license-actions";
import type { ChangeLine } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatDate, plural } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import type { FlowContext } from "./flow-context";

const MIN_REASON = 10;

const steps = ["Review impact", "Provide details", "Confirm request"] as const;

const communicationOptions = [
  { value: "not_contacted", label: "Customer not yet contacted" },
  { value: "notified", label: "Customer notified" },
  { value: "agreed", label: "Customer agreed in writing" },
];

type Errors = Partial<
  Record<"source" | "reason" | "communication" | "rebindFrom" | "rebindTo" | "typed", string>
>;

/**
 * Governed license flow (spec §15, §21, §31). The operator reviews impact, gives a reason
 * and confirms; the result is an approval request, never a direct change. Without the
 * Control API the final step ends in an explicit not-connected outcome.
 */
export function GovernedFlow({ context }: { context: FlowContext }) {
  const { policy, license } = context;
  const hydrated = useHydrated();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [source, setSource] = useState("");
  const [reason, setReason] = useState("");
  const [communication, setCommunication] = useState("");
  const [effective, setEffective] = useState("end_of_grace");
  const [term, setTerm] = useState("12");
  const [rebindFrom, setRebindFrom] = useState("");
  const [rebindTo, setRebindTo] = useState("");
  const [typed, setTyped] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, done]);

  const option = context.issueOptions.find((o) => `${o.contractId}:${o.productId}` === source);
  const needsCommunication = context.action === "suspend" || context.action === "revoke";

  const changes = useMemo<ChangeLine[]>(() => {
    switch (context.action) {
      case "issue":
        return option
          ? [
              { field: "License", before: "—", after: `New license for ${option.customerName}` },
              {
                field: "Valid",
                before: "—",
                after: `${formatDate(option.validFrom)} to ${formatDate(option.expiresAt)}`,
              },
              ...option.entitlements.map((e) => ({ field: e.label, before: "—", after: e.value })),
            ]
          : [];
      case "renew":
        return license
          ? [
              {
                field: "Valid until",
                before: formatDate(license.expiresAt),
                after: formatDate(renewedExpiry(license.expiresAt, Number(term))),
              },
              ...(license.state !== "active"
                ? [{ field: "State", before: license.state.replaceAll("_", " "), after: "active" }]
                : []),
              {
                field: "Revision",
                before: String(license.revision),
                after: String(license.revision + 1),
              },
            ]
          : [];
      case "replace":
        return license
          ? [
              {
                field: "Revision",
                before: String(license.revision),
                after: String(license.revision + 1),
              },
              { field: "Rights", before: "Current entitlements", after: "Unchanged" },
            ]
          : [];
      case "rebind": {
        const from = context.bindings.find((b) => b.id === rebindFrom);
        const to = context.rebindTargets.find((b) => b.id === rebindTo);
        return [
          {
            field: "Bound deployment",
            before: from?.name ?? "Choose a deployment",
            after: to?.name ?? "Choose a deployment",
          },
        ];
      }
      case "suspend":
        return license
          ? [{ field: "State", before: license.state.replaceAll("_", " "), after: "suspended" }]
          : [];
      case "revoke":
        return license
          ? [
              { field: "State", before: license.state.replaceAll("_", " "), after: "revoked" },
              {
                field: "Effective",
                before: "—",
                after:
                  effective === "immediately"
                    ? "Immediately after approval"
                    : "At the end of the grace period",
              },
            ]
          : [];
    }
  }, [context, license, option, term, rebindFrom, rebindTo, effective]);

  if (!context.availability.allowed) {
    return (
      <Notice tone="risk" title={`${policy.label} is not available`}>
        {context.availability.reason}{" "}
        <Link href={context.backHref} className="font-medium text-fg underline">
          Go back
        </Link>
      </Notice>
    );
  }

  function validate(target: number): Errors {
    const next: Errors = {};
    if (target >= 0 && context.action === "issue" && !option)
      next.source = "Choose the contract line to license.";
    if (target >= 1) {
      if (reason.trim().length < MIN_REASON)
        next.reason = `Enter a reason of at least ${MIN_REASON} characters. It becomes part of the audit record.`;
      if (needsCommunication && !communication)
        next.communication = "Record the customer communication state.";
      if (context.action === "rebind") {
        if (!rebindFrom) next.rebindFrom = "Choose the deployment to unbind.";
        if (!rebindTo) next.rebindTo = "Choose the deployment to bind.";
      }
    }
    if (target >= 2 && policy.typedConfirmation && typed !== license?.id) {
      next.typed = `Type ${license?.id} exactly to confirm.`;
    }
    return next;
  }

  function advance() {
    const next = validate(step);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      // Move focus to the first invalid field so keyboard and screen reader users land on it.
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(),
      );
      return;
    }
    if (step < steps.length - 1) setStep(step + 1);
    else setDone(true);
  }

  if (done) {
    return (
      <div data-hydrated={hydrated} className="flex flex-col gap-4">
        <h2 ref={headingRef} tabIndex={-1} className="text-section-title outline-none">
          Request prepared
        </h2>
        <Notice title="Not connected to the Control API">
          In production this creates an approval request that needs{" "}
          {plural(policy.approvals, "approver")} other than you
          {policy.stepUp ? ", after step-up authentication" : ""}. Nothing was saved, signed or
          recorded in audit.
        </Notice>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={context.backHref}>
              {license ? `Back to ${license.id}` : "Back to licensing"}
            </Link>
          </Button>
          <Button asChild variant="link">
            <Link href="/approvals">Open approval queue</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      data-hydrated={hydrated}
      aria-labelledby="flow-step-title"
      onSubmit={(event) => {
        event.preventDefault();
        advance();
      }}
      className="flex flex-col gap-6"
    >
      <ol aria-label="Progress" className="grid gap-2 sm:grid-cols-3">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-control border px-3 py-2 text-dense",
              index === step
                ? "border-violet bg-violet-subtle font-medium text-fg"
                : "border-border text-fg-muted",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex size-5 items-center justify-center rounded-full text-micro",
                index < step
                  ? "bg-violet text-white"
                  : index === step
                    ? "bg-ink text-canvas"
                    : "bg-surface-sunken",
              )}
            >
              {index < step ? <Check className="size-3" /> : index + 1}
            </span>
            {label}
            {index < step ? <span className="sr-only">(complete)</span> : null}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card aria-labelledby="flow-step-title">
          <CardHeader>
            <div>
              <h2
                id="flow-step-title"
                ref={headingRef}
                tabIndex={-1}
                className="text-card-title text-fg outline-none"
              >
                {steps[step]}
              </h2>
              <CardDescription>{policy.message}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {step === 0 ? (
              <>
                {context.action === "issue" ? (
                  <Field>
                    <Label htmlFor="flow-source">Source contract line</Label>
                    <Select
                      id="flow-source"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      aria-invalid={errors.source ? true : undefined}
                      aria-describedby={errors.source ? "flow-source-error" : "flow-source-hint"}
                    >
                      <option value="">Choose a contract line</option>
                      {context.issueOptions.map((o) => (
                        <option
                          key={`${o.contractId}:${o.productId}`}
                          value={`${o.contractId}:${o.productId}`}
                        >
                          {o.customerName} · {o.productName} · {o.contractNumber}
                        </option>
                      ))}
                    </Select>
                    {errors.source ? (
                      <FieldError id="flow-source-error">{errors.source}</FieldError>
                    ) : (
                      <FieldHint id="flow-source-hint">
                        {context.issueOptions.length
                          ? "Only contract lines without a license are listed."
                          : "Every contract line already has a license."}
                      </FieldHint>
                    )}
                  </Field>
                ) : null}
                {context.bindings.length ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-dense font-medium text-fg">Affected deployments</p>
                    <ul className="flex flex-col gap-1.5">
                      {context.bindings.map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between gap-3 text-dense"
                        >
                          <span className="text-fg">
                            {b.name} <span className="text-fg-muted">· {b.environment}</span>
                          </span>
                          <StatusBadge
                            tone={
                              b.match === "mismatch"
                                ? "risk"
                                : b.match === "unknown"
                                  ? "neutral"
                                  : "healthy"
                            }
                            label={
                              b.match === "mismatch"
                                ? "Mismatch"
                                : b.match === "unknown"
                                  ? "Unknown"
                                  : "Matches"
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : context.action !== "issue" ? (
                  <p className="text-dense text-fg-muted">
                    No deployments are bound to this license.
                  </p>
                ) : null}
              </>
            ) : null}

            {step === 1 ? (
              <>
                {context.action === "renew" ? (
                  <Field>
                    <Label htmlFor="flow-term">Renewal term</Label>
                    <Select id="flow-term" value={term} onChange={(e) => setTerm(e.target.value)}>
                      <option value="12">12 months</option>
                      <option value="24">24 months</option>
                      <option value="36">36 months</option>
                    </Select>
                    <FieldHint>
                      Extends from the current expiry,{" "}
                      {license ? formatDate(license.expiresAt) : ""}.
                    </FieldHint>
                  </Field>
                ) : null}
                {context.action === "rebind" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <Label htmlFor="flow-from">Unbind deployment</Label>
                      <Select
                        id="flow-from"
                        value={rebindFrom}
                        onChange={(e) => setRebindFrom(e.target.value)}
                        aria-invalid={errors.rebindFrom ? true : undefined}
                        aria-describedby={errors.rebindFrom ? "flow-from-error" : undefined}
                      >
                        <option value="">Choose a deployment</option>
                        {context.bindings.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.environment})
                          </option>
                        ))}
                      </Select>
                      {errors.rebindFrom ? (
                        <FieldError id="flow-from-error">{errors.rebindFrom}</FieldError>
                      ) : null}
                    </Field>
                    <Field>
                      <Label htmlFor="flow-to">Bind deployment</Label>
                      <Select
                        id="flow-to"
                        value={rebindTo}
                        onChange={(e) => setRebindTo(e.target.value)}
                        aria-invalid={errors.rebindTo ? true : undefined}
                        aria-describedby={errors.rebindTo ? "flow-to-error" : "flow-to-hint"}
                      >
                        <option value="">Choose a deployment</option>
                        {context.rebindTargets.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.environment})
                          </option>
                        ))}
                      </Select>
                      {errors.rebindTo ? (
                        <FieldError id="flow-to-error">{errors.rebindTo}</FieldError>
                      ) : (
                        <FieldHint id="flow-to-hint">
                          Only this customer&apos;s registered deployments.
                        </FieldHint>
                      )}
                    </Field>
                  </div>
                ) : null}
                {context.action === "revoke" ? (
                  <Field>
                    <Label htmlFor="flow-effective">Effective</Label>
                    <Select
                      id="flow-effective"
                      value={effective}
                      onChange={(e) => setEffective(e.target.value)}
                    >
                      <option value="end_of_grace">At the end of the grace period</option>
                      <option value="immediately">Immediately after approval</option>
                    </Select>
                  </Field>
                ) : null}
                {needsCommunication ? (
                  <Field>
                    <Label htmlFor="flow-communication">Customer communication</Label>
                    <Select
                      id="flow-communication"
                      value={communication}
                      onChange={(e) => setCommunication(e.target.value)}
                      aria-invalid={errors.communication ? true : undefined}
                      aria-describedby={
                        errors.communication ? "flow-communication-error" : undefined
                      }
                    >
                      <option value="">Choose a state</option>
                      {communicationOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                    {errors.communication ? (
                      <FieldError id="flow-communication-error">{errors.communication}</FieldError>
                    ) : null}
                  </Field>
                ) : null}
                <Field>
                  <Label htmlFor="flow-reason">Reason</Label>
                  <Textarea
                    id="flow-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    aria-invalid={errors.reason ? true : undefined}
                    aria-describedby={errors.reason ? "flow-reason-error" : "flow-reason-hint"}
                  />
                  {errors.reason ? (
                    <FieldError id="flow-reason-error">{errors.reason}</FieldError>
                  ) : (
                    <FieldHint id="flow-reason-hint">
                      Approvers see this reason; it is kept in the permanent decision history.
                    </FieldHint>
                  )}
                </Field>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <dl className="grid gap-3 text-dense sm:grid-cols-2">
                  <div>
                    <dt className="text-micro text-fg-muted">Requested by</dt>
                    <dd className="text-fg">{context.requesterName}</dd>
                  </div>
                  <div>
                    <dt className="text-micro text-fg-muted">Approvals required</dt>
                    <dd className="text-fg">
                      {plural(policy.approvals, "approver")} other than you
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-micro text-fg-muted">Eligible approvers</dt>
                    <dd className="text-fg">
                      {context.approverNames.join(", ") || "None available"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-micro text-fg-muted">Reason</dt>
                    <dd className="text-fg">{reason}</dd>
                  </div>
                </dl>
                {policy.stepUp ? (
                  <Notice tone="risk" title="Step-up authentication required">
                    You will be asked to re-authenticate before the request is sent.
                  </Notice>
                ) : null}
                {policy.typedConfirmation && license ? (
                  <Field>
                    <Label htmlFor="flow-typed">Type {license.id} to confirm</Label>
                    <Input
                      id="flow-typed"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      className="font-mono"
                      aria-invalid={errors.typed ? true : undefined}
                      aria-describedby={errors.typed ? "flow-typed-error" : undefined}
                    />
                    {errors.typed ? (
                      <FieldError id="flow-typed-error">{errors.typed}</FieldError>
                    ) : null}
                  </Field>
                ) : null}
              </>
            ) : null}
          </CardContent>
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            {step === 0 ? (
              <Button asChild variant="ghost">
                <Link href={context.backHref}>Cancel</Link>
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <Button
              type="submit"
              variant={step === 2 && policy.highImpact ? "destructive" : "primary"}
            >
              {step === 2 ? "Request approval" : "Continue"}
            </Button>
          </div>
        </Card>

        <aside aria-label="Proposed change" className="flex flex-col gap-4">
          <Card aria-labelledby="proposed-change">
            <CardHeader>
              <div>
                <CardTitle id="proposed-change">Proposed change</CardTitle>
                <CardDescription>
                  {license
                    ? `${license.id} · ${license.customerName}`
                    : option
                      ? option.customerName
                      : "Choose a contract line"}
                </CardDescription>
              </div>
            </CardHeader>
            {changes.length ? (
              <Table label="Proposed change">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Field</TableHeaderCell>
                    <TableHeaderCell>Before</TableHeaderCell>
                    <TableHeaderCell>After</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {changes.map((line) => (
                    <TableRow key={line.field}>
                      <TableCell className="text-fg">{line.field}</TableCell>
                      <TableCell className="text-fg-muted">{line.before}</TableCell>
                      <TableCell className="font-medium text-fg">{line.after}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <CardContent className="text-dense text-fg-muted">Nothing to show yet.</CardContent>
            )}
          </Card>
          <Card aria-labelledby="policy">
            <CardHeader>
              <CardTitle id="policy">Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1.5 text-dense text-fg-secondary">
                <li>{policy.approvals > 1 ? "Four eyes approval" : "Second-person approval"}</li>
                <li>Requester cannot approve</li>
                {policy.stepUp ? <li>Step-up authentication</li> : null}
                {policy.typedConfirmation ? <li>Typed confirmation</li> : null}
                <li>Signing happens in the License Issuer, never in the browser</li>
              </ul>
              {policy.highImpact ? (
                <p className="mt-3 inline-flex items-center gap-1.5 text-dense font-medium text-coral-text">
                  <ShieldAlert aria-hidden="true" className="size-4" />
                  High impact action
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  );
}
