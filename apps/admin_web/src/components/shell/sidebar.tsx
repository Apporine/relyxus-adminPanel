"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Suspense, useId } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import type { Environment } from "@/domain/types";
import { cn } from "@/lib/cn";
import { isActivePath, primaryNavigation } from "./navigation";
import { useShell } from "./shell-state";

function ApporineMark({ className }: { className?: string }) {
  const gradient = useId();
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8a63ff" />
          <stop offset="1" stopColor="var(--ap-violet)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradient})`} />
      <path d="M16 7 25 25h-4.2L16 15.4 11.2 25H7L16 7Z" fill="#fff" />
      <circle cx="16" cy="22" r="2.2" fill="var(--ap-cyan)" />
    </svg>
  );
}

type NavListProps = { collapsed: boolean; onNavigate?: () => void };

function NavItems({ collapsed, onNavigate, pathname }: NavListProps & { pathname: string | null }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {primaryNavigation.map((item) => {
        const active = pathname !== null && isActivePath(pathname, item.href);
        const link = (
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={cn(
              "group/item relative flex h-9 items-center gap-3 rounded-control px-3 text-body font-medium text-nav-fg-muted",
              "transition-[color,background-color] duration-(--ap-duration-panel) hover:bg-nav-raised hover:text-nav-fg",
              "aria-[current=page]:bg-linear-to-r aria-[current=page]:from-violet/35 aria-[current=page]:to-nav-active/60 aria-[current=page]:text-nav-fg",
              "aria-[current=page]:before:absolute aria-[current=page]:before:inset-y-2 aria-[current=page]:before:start-0 aria-[current=page]:before:w-[3px] aria-[current=page]:before:animate-fade-in aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-violet aria-[current=page]:before:shadow-[0_0_12px_2px_rgb(112_64_255/0.75)]",
              collapsed && "justify-center px-0",
            )}
          >
            <item.icon
              aria-hidden="true"
              className="size-[18px] shrink-0 transition-transform duration-(--ap-duration-panel) ease-(--ap-ease-emphasized) group-hover/item:scale-110 group-aria-[current=page]/item:text-chart-primary-2"
            />
            {collapsed ? null : <span className="truncate">{item.label}</span>}
          </Link>
        );
        return (
          <li key={item.href}>
            {collapsed ? (
              <Tooltip content={item.label} side="right">
                {link}
              </Tooltip>
            ) : (
              link
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ActiveNavItems(props: NavListProps) {
  return <NavItems {...props} pathname={usePathname()} />;
}

/**
 * On routes with request-time params the pathname is unknown while prerendering, so the
 * active highlight streams in; the fallback renders the same links without it.
 */
function NavList(props: NavListProps) {
  return (
    <Suspense fallback={<NavItems {...props} pathname={null} />}>
      <ActiveNavItems {...props} />
    </Suspense>
  );
}

function Brand({ collapsed, environment }: { collapsed: boolean; environment: Environment }) {
  return (
    <div
      className={cn(
        "flex h-topbar shrink-0 items-center gap-2.5 px-4",
        collapsed && "justify-center px-0",
      )}
    >
      <ApporineMark className="size-7 shrink-0" />
      {collapsed ? null : (
        <div className="min-w-0 leading-tight">
          <p className="text-card-title text-nav-fg">Apporine</p>
          <p className="truncate text-micro text-nav-fg-muted">
            Control plane · <span className="font-mono">{environment.toLowerCase()}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Primary navigation on the Ink surface (spec §6.2, §7). Expanded 248 px, collapsible to
 * a 72 px icon rail; below 1280 px it is a rail by default, below 768 px a drawer.
 */
export function Sidebar({ environment }: { environment: Environment }) {
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen } = useShell();
  return (
    <>
      <nav
        aria-label="Primary"
        data-collapsed={sidebarCollapsed}
        className={cn(
          "group/sidebar sticky top-0 z-(--z-nav) hidden h-dvh shrink-0 flex-col border-e border-nav-border bg-nav nav-glow md:flex",
          "w-sidebar-collapsed xl:w-sidebar data-[collapsed=true]:xl:w-sidebar-collapsed",
          "transition-[width] duration-(--ap-duration-panel) ease-standard",
        )}
      >
        {/* Rail rendering below xl, or when the user collapses it. */}
        <div className="flex min-h-0 flex-1 flex-col xl:hidden group-data-[collapsed=true]/sidebar:xl:flex">
          <Brand collapsed environment={environment} />
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <NavList collapsed />
          </div>
        </div>
        <div className="hidden min-h-0 flex-1 flex-col xl:flex group-data-[collapsed=true]/sidebar:xl:hidden">
          <Brand collapsed={false} environment={environment} />
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <NavList collapsed={false} />
          </div>
        </div>
        <div className="hidden border-t border-nav-border p-3 xl:block">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!sidebarCollapsed}
            className={cn(
              "flex h-9 w-full items-center gap-3 rounded-control px-3 text-dense text-nav-fg-muted hover:bg-nav-raised hover:text-nav-fg",
              sidebarCollapsed && "justify-center px-0",
            )}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-[18px]" />
            ) : (
              <>
                <PanelLeftClose aria-hidden="true" className="size-[18px]" />
                Collapse
              </>
            )}
          </button>
        </div>
      </nav>

      <DialogPrimitive.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-drawer) bg-ink/50 data-[state=open]:animate-fade-in md:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 start-0 z-(--z-drawer) flex w-72 flex-col bg-nav nav-glow md:hidden">
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Primary modules of the Apporine control plane.
            </DialogPrimitive.Description>
            <Brand collapsed={false} environment={environment} />
            <nav aria-label="Primary" className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <NavList collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
            </nav>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
