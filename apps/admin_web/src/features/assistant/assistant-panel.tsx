"use client";

import { ArrowRight, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";
import { Field, Input, Label, Select } from "@/components/ui/field";
import { interpretQuestion, type Brief } from "@/domain/assistant";
import { cn } from "@/lib/cn";

type Capability = "portfolio" | "customer" | "renewal" | "release" | "audit" | "ask";

const capabilities: { id: Capability; label: string }[] = [
  { id: "portfolio", label: "Portfolio" },
  { id: "customer", label: "Customer" },
  { id: "renewal", label: "Renewal" },
  { id: "release", label: "Release impact" },
  { id: "audit", label: "Audit" },
  { id: "ask", label: "Ask" },
];

export interface Choice {
  id: string;
  label: string;
  brief: Brief;
}

function BriefView({ brief, onNavigate }: { brief: Brief; onNavigate: () => void }) {
  return (
    <section aria-label={brief.title} className="flex flex-col gap-2">
      <h3 className="text-card-title text-fg">{brief.title}</h3>
      <ul className="flex flex-col gap-2">
        {brief.lines.map((line, i) => (
          <li key={i}>
            <Link
              href={line.href}
              onClick={onNavigate}
              className="group flex items-start justify-between gap-3 rounded-control border border-border bg-surface px-3 py-2 text-dense text-fg hover:border-violet/40 hover:bg-surface-hover"
            >
              <span>{line.text}</span>
              <ArrowRight
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-fg-muted group-hover:text-violet-text"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Picker({
  id,
  label,
  choices,
  onNavigate,
}: {
  id: string;
  label: string;
  choices: Choice[];
  onNavigate: () => void;
}) {
  const [selected, setSelected] = useState(choices[0]?.id ?? "");
  const choice = choices.find((c) => c.id === selected);
  return (
    <div className="flex flex-col gap-4">
      <Field>
        <Label htmlFor={id}>{label}</Label>
        <Select id={id} value={selected} onChange={(e) => setSelected(e.target.value)}>
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      {choice ? <BriefView brief={choice.brief} onNavigate={onNavigate} /> : null}
    </div>
  );
}

/**
 * Operator assistant panel (spec §29). Read only: briefs are assembled from records and
 * every line opens its source; questions become permission-aware filter links.
 */
export function AssistantPanel({
  portfolio,
  customers,
  renewals,
  releases,
  audits,
}: {
  portfolio: Brief;
  customers: Choice[];
  renewals: Choice[];
  releases: Choice[];
  audits: Choice[];
}) {
  const [open, setOpen] = useState(false);
  const [capability, setCapability] = useState<Capability>("portfolio");
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<string>();
  const close = () => setOpen(false);
  const answer = asked
    ? interpretQuestion(
        asked,
        customers.map((c) => ({ id: c.id, name: c.label })),
      )
    : undefined;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className="relative inline-flex size-9 items-center justify-center rounded-control text-fg-secondary hover:bg-surface-hover hover:text-fg"
        aria-label="Open operator assistant"
      >
        <Sparkles aria-hidden="true" className="size-[18px]" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-dialog) bg-ink/30 data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed inset-y-0 end-0 z-(--z-dialog) flex w-full max-w-lg flex-col border-s border-border bg-surface shadow-overlay data-[state=open]:animate-drawer-in">
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <DialogPrimitive.Title className="flex items-center gap-2 text-section-title text-fg">
                <Sparkles aria-hidden="true" className="size-5 text-violet-text" />
                Operator assistant
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-dense text-fg-muted">
                Read only. Briefs are assembled from records you can see, and every line links to
                its source. Nothing is changed.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close assistant"
              className="-me-2 inline-flex size-8 shrink-0 items-center justify-center rounded-control text-fg-muted hover:bg-surface-hover hover:text-fg"
            >
              <X aria-hidden="true" className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            <nav aria-label="Assistant capabilities">
              <ul className="flex flex-wrap gap-1">
                {capabilities.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={capability === c.id}
                      onClick={() => setCapability(c.id)}
                      className={cn(
                        "inline-flex h-8 items-center rounded-control px-3 text-dense font-medium",
                        capability === c.id
                          ? "bg-ink text-canvas"
                          : "text-fg-muted hover:bg-surface-hover hover:text-fg",
                      )}
                    >
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {capability === "portfolio" ? <BriefView brief={portfolio} onNavigate={close} /> : null}
            {capability === "customer" ? (
              <Picker
                id="assistant-customer"
                label="Customer"
                choices={customers}
                onNavigate={close}
              />
            ) : null}
            {capability === "renewal" ? (
              <Picker
                id="assistant-renewal"
                label="Contract"
                choices={renewals}
                onNavigate={close}
              />
            ) : null}
            {capability === "release" ? (
              <Picker
                id="assistant-release"
                label="Release"
                choices={releases}
                onNavigate={close}
              />
            ) : null}
            {capability === "audit" ? (
              <Picker id="assistant-audit" label="Action" choices={audits} onNavigate={close} />
            ) : null}
            {capability === "ask" ? (
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setAsked(question.trim() || undefined);
                }}
              >
                <Field>
                  <Label htmlFor="assistant-question">Question</Label>
                  <Input
                    id="assistant-question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Which licenses are in grace?"
                  />
                </Field>
                <button
                  type="submit"
                  className="inline-flex h-9 w-fit items-center rounded-control bg-violet px-4 text-body font-semibold text-white hover:bg-violet-hover"
                >
                  Find records
                </button>
                <div aria-live="polite">
                  {asked ? (
                    answer ? (
                      <Link
                        href={answer.href}
                        onClick={close}
                        className="flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2 text-dense text-fg hover:border-violet/40 hover:bg-surface-hover"
                      >
                        <span>
                          {answer.explanation}
                          <code className="block font-mono text-micro text-fg-muted">
                            {answer.href}
                          </code>
                        </span>
                        <ArrowRight aria-hidden="true" className="size-3.5 text-fg-muted" />
                      </Link>
                    ) : (
                      <p className="text-dense text-fg-muted">
                        I can&apos;t turn that into a filter yet. Try the search (Ctrl K) or the
                        report builder.
                      </p>
                    )
                  ) : null}
                </div>
                <p className="text-micro text-fg-muted">
                  Pages apply filters with your permissions, so a question never widens access.
                </p>
              </form>
            ) : null}

            <p className="mt-auto rounded-control bg-surface-sunken px-3 py-2 text-micro text-fg-muted">
              Any change the assistant suggests becomes a normal action with the same reason,
              approval and audit as one you start yourself.
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
