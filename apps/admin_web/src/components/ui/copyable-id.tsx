"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** IDs, digests and fingerprints render in monospace with one-click copy (spec §6.2). */
export function CopyableId({
  value,
  label,
  truncate = false,
  className,
}: {
  value: string;
  /** What the value is, for the copy button's accessible name (for example "License ID"). */
  label: string;
  /** Shorten long digests to the first and last characters for display. */
  truncate?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard can be unavailable (permissions, insecure context); the value stays selectable.
    }
  }

  const display =
    truncate && value.length > 20 ? `${value.slice(0, 12)}…${value.slice(-6)}` : value;

  return (
    <span className={cn("inline-flex max-w-full items-center gap-1", className)}>
      <code className="truncate font-mono text-micro text-fg" title={value}>
        {display}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-control text-fg-muted hover:bg-surface-hover hover:text-fg"
      >
        {copied ? (
          <Check aria-hidden="true" className="size-3.5 text-cyan-text" />
        ) : (
          <Copy aria-hidden="true" className="size-3.5" />
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? `${label} copied to clipboard` : ""}
      </span>
    </span>
  );
}
