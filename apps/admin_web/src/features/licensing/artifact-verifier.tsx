"use client";

import { CircleCheck, CircleDashed, OctagonAlert } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { Field, FieldHint, Label, Textarea } from "@/components/ui/field";
import { inspectArtifact, type ArtifactCheck } from "@/domain/artifact";
import type { License } from "@/domain/types";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/use-hydrated";

const statusPresentation: Record<
  ArtifactCheck["status"],
  { icon: typeof CircleCheck; label: string; className: string }
> = {
  pass: { icon: CircleCheck, label: "Pass", className: "text-cyan-text" },
  fail: { icon: OctagonAlert, label: "Fail", className: "text-coral-text" },
  not_checked: { icon: CircleDashed, label: "Not checked", className: "text-fg-muted" },
};

/**
 * Artifact verify (spec §15, §30): structure, payload integrity and the immutable
 * revision record are checked here; the signature is verified by the License Issuer.
 */
export function ArtifactVerifier({
  licenses,
  examples,
}: {
  licenses: License[];
  examples: { label: string; artifact: string }[];
}) {
  const hydrated = useHydrated();
  const [text, setText] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof inspectArtifact>>>();
  const [busy, setBusy] = useState(false);

  async function verify() {
    setBusy(true);
    setResult(await inspectArtifact(text, licenses));
    setBusy(false);
  }

  return (
    <div data-hydrated={hydrated} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card aria-labelledby="artifact-input">
        <CardHeader>
          <div>
            <CardTitle id="artifact-input">Artifact</CardTitle>
            <CardDescription>
              Paste a license artifact. Nothing is uploaded or stored.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <Button
                key={example.label}
                size="sm"
                onClick={() => {
                  setText(example.artifact);
                  setResult(undefined);
                }}
              >
                {example.label}
              </Button>
            ))}
          </div>
          <Field>
            <Label htmlFor="artifact-text">Artifact JSON</Label>
            <Textarea
              id="artifact-text"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setResult(undefined);
              }}
              spellCheck={false}
              className="min-h-80 font-mono text-micro"
            />
            <FieldHint>
              Contains license metadata only. Never paste secrets or customer credentials.
            </FieldHint>
          </Field>
          <Button
            variant="primary"
            className="self-start"
            disabled={!text.trim() || busy}
            onClick={verify}
          >
            Verify artifact
          </Button>
        </CardContent>
      </Card>

      <Card aria-labelledby="artifact-result">
        <CardHeader>
          <div>
            <CardTitle id="artifact-result">Result</CardTitle>
            <CardDescription>Each check states what it found; nothing is changed.</CardDescription>
          </div>
          {result ? (
            <StatusBadge
              tone={result.verdict === "valid" ? "healthy" : "critical"}
              label={result.verdict === "valid" ? "Integrity verified" : "Verification failed"}
            />
          ) : null}
        </CardHeader>
        <CardContent aria-live="polite">
          {result ? (
            <ol className="flex flex-col">
              {result.checks.map((check) => {
                const p = statusPresentation[check.status];
                return (
                  <li
                    key={check.id}
                    className="flex gap-3 border-t border-border py-3 first:border-t-0"
                  >
                    <p.icon
                      aria-hidden="true"
                      className={cn("mt-0.5 size-4 shrink-0", p.className)}
                    />
                    <div className="min-w-0">
                      <p className="text-dense font-medium text-fg">
                        {check.label}{" "}
                        <span className={cn("ms-1 text-micro", p.className)}>{p.label}</span>
                      </p>
                      <p className="text-dense text-fg-secondary">{check.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <Notice title="No artifact checked yet">
              Paste an artifact or load an example, then choose Verify artifact.
            </Notice>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
