"use client";

import { Command } from "cmdk";
import {
  Building2,
  ClipboardPlus,
  CornerDownLeft,
  FilePlus2,
  KeyRound,
  ListChecks,
  Search,
  Server,
  Stamp,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useMemo, useState } from "react";
import { Kbd } from "@/components/ui/feedback";
import {
  matchSearch,
  parseSearchQuery,
  searchResultTypeLabel,
  type SearchResult,
  type SearchResultType,
} from "@/domain/search";
import { primaryNavigation } from "./navigation";
import { useShell } from "./shell-state";

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Quick actions from spec §7.1. Each opens the screen that owns the flow; high impact
 * actions never execute from the palette.
 */
const quickActions: QuickAction[] = [
  { label: "Create customer", href: "/customers?create=1", icon: Building2 },
  { label: "Create contract", href: "/commercial?create=1", icon: FilePlus2 },
  { label: "Issue license request", href: "/licensing/issue", icon: KeyRound },
  { label: "Add deployment", href: "/deployments?create=1", icon: Server },
  { label: "Create task", href: "/?task=1", icon: ClipboardPlus },
  { label: "Open approval queue", href: "/approvals", icon: Stamp },
];

const grammarExamples = [
  "customer:northwind",
  "license:LIC_00391",
  "deployment:prod",
  "product:relyxus status:active",
  "release:2.3.1",
];

const typeOrder: SearchResultType[] = [
  "customer",
  "license",
  "deployment",
  "contract",
  "contact",
  "release",
  "product",
];

const MAX_PER_GROUP = 6;

const itemClass =
  "flex h-10 cursor-default items-center gap-3 rounded-control px-3 text-body text-fg data-[selected=true]:bg-surface-selected [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-muted";

const groupClass =
  "px-2 pb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-fg-muted";

export function CommandPalette({ index }: { index: SearchResult[] }) {
  const { paletteOpen, setPaletteOpen } = useShell();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const results = matchSearch(index, parseSearchQuery(query));
    return typeOrder
      .map((type) => ({
        type,
        items: results.filter((r) => r.type === type).slice(0, MAX_PER_GROUP),
      }))
      .filter((group) => group.items.length > 0);
  }, [index, query]);

  const lowered = query.trim().toLowerCase();
  const matchingActions = quickActions.filter((a) => a.label.toLowerCase().includes(lowered));
  const matchingModules = primaryNavigation.filter((n) => n.label.toLowerCase().includes(lowered));

  function go(href: string) {
    setPaletteOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <DialogPrimitive.Root
      open={paletteOpen}
      onOpenChange={(open) => {
        setPaletteOpen(open);
        if (!open) setQuery("");
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-palette) bg-ink/40 backdrop-blur-[3px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed start-1/2 top-[10vh] z-(--z-palette) w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-dialog border border-border bg-surface shadow-overlay data-[state=closed]:animate-pop-out data-[state=open]:animate-pop rtl:translate-x-1/2">
          <DialogPrimitive.Title className="sr-only">Search and commands</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search customers, licenses, deployments, contracts, contacts and releases, or run a
            quick action.
          </DialogPrimitive.Description>
          <Command shouldFilter={false} label="Search and commands" loop>
            <div className="flex items-center gap-3 border-b-2 border-border px-4 has-[input:focus-visible]:border-violet">
              <Search aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search or type a command, for example customer:halden"
                className="h-14 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-muted focus-visible:shadow-none focus-visible:outline-none"
              />
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto pb-2">
              <Command.Empty className="px-5 py-8 text-center text-body text-fg-muted">
                No results in your current scope. Try a filter such as{" "}
                <code className="font-mono text-micro">license:</code> or{" "}
                <code className="font-mono text-micro">deployment:</code>.
              </Command.Empty>

              {grouped.map((group) => (
                <Command.Group
                  key={group.type}
                  heading={searchResultTypeLabel[group.type]}
                  className={groupClass}
                >
                  {group.items.map((item) => (
                    <Command.Item
                      key={`${item.type}-${item.id}`}
                      value={`${item.type}-${item.id}`}
                      onSelect={() => go(item.href)}
                      className={itemClass}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        <span
                          className={
                            item.type === "license" ? "font-mono text-dense" : "font-medium"
                          }
                        >
                          {item.title}
                        </span>
                        <span className="ms-2 text-dense text-fg-muted">{item.subtitle}</span>
                      </span>
                      <CornerDownLeft
                        aria-hidden="true"
                        className="opacity-0 [[data-selected=true]_&]:opacity-100"
                      />
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}

              {matchingActions.length > 0 ? (
                <Command.Group heading="Quick actions" className={groupClass}>
                  {matchingActions.map((action) => (
                    <Command.Item
                      key={action.label}
                      value={`action-${action.label}`}
                      onSelect={() => go(action.href)}
                      className={itemClass}
                    >
                      <action.icon aria-hidden="true" />
                      {action.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {matchingModules.length > 0 ? (
                <Command.Group heading="Go to" className={groupClass}>
                  {matchingModules.map((item) => (
                    <Command.Item
                      key={item.href}
                      value={`nav-${item.href}`}
                      onSelect={() => go(item.href)}
                      className={itemClass}
                    >
                      <item.icon aria-hidden="true" />
                      {item.label}
                      <span className="ms-2 truncate text-dense text-fg-muted">
                        {item.description}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}
            </Command.List>
            {query ? null : (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-5 py-3 text-micro text-fg-muted">
                <ListChecks aria-hidden="true" className="size-3.5" />
                Filters:
                {grammarExamples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setQuery(example)}
                    className="rounded-control bg-surface-sunken px-1.5 py-0.5 font-mono text-fg-secondary hover:text-fg"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
