"use client";

import { Bell, CircleHelp, LogOut, Menu, Palette, Search, Stamp } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, Popover } from "radix-ui";
import { Kbd } from "@/components/ui/feedback";
import { Select } from "@/components/ui/field";
import { priority as priorityPresentation, roleName } from "@/domain/status";
import type { Environment, Product, StaffUser, Task } from "@/domain/types";
import { cn } from "@/lib/cn";
import { EnvironmentBadge } from "./environment-badge";
import { useShell } from "./shell-state";

const iconButton =
  "relative inline-flex size-9 items-center justify-center rounded-control text-fg-secondary hover:bg-surface-hover hover:text-fg";

const popoverPanel = cn(
  "z-(--z-toast) w-80 rounded-card border border-border bg-surface p-1.5 shadow-overlay",
  "origin-(--radix-popper-transform-origin) data-[state=closed]:animate-pop-out data-[state=open]:animate-pop",
);

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function SearchTrigger() {
  const { setPaletteOpen } = useShell();
  return (
    <button
      type="button"
      onClick={() => setPaletteOpen(true)}
      aria-keyshortcuts="Control+K Meta+K"
      className="flex h-9 w-full max-w-md min-w-0 items-center gap-2 rounded-control border border-border-strong bg-canvas/70 px-3 text-body text-fg-muted transition-[border-color,box-shadow,background-color] duration-(--ap-duration-panel) hover:border-border-control hover:bg-surface hover:shadow-card"
    >
      <Search aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">Search customers, licenses, deployments…</span>
      <span className="ms-auto hidden items-center gap-1 lg:flex" aria-hidden="true">
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}

function ProductFilter({ products }: { products: Product[] }) {
  const { productFilter, setProductFilter } = useShell();
  return (
    <label className="hidden items-center gap-2 text-dense text-fg-muted lg:flex">
      <span>Product</span>
      <Select
        value={productFilter}
        onChange={(event) => setProductFilter(event.target.value)}
        className="h-8 w-40 border-border-strong text-dense font-medium"
      >
        <option value="all">All products</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </Select>
    </label>
  );
}

function Notifications({ tasks }: { tasks: Task[] }) {
  const urgent = tasks.filter((t) => t.priority === "critical" || t.priority === "high");
  return (
    <Popover.Root>
      <Popover.Trigger
        className={iconButton}
        aria-label={`Notifications, ${urgent.length} need attention`}
      >
        <Bell aria-hidden="true" className="size-[18px]" />
        {urgent.length > 0 ? (
          <span
            aria-hidden="true"
            className="absolute end-1.5 top-1.5 size-2 rounded-full bg-coral ring-2 ring-surface before:absolute before:inset-0 before:animate-ping-soft before:rounded-full before:bg-coral"
          />
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className={popoverPanel}>
          <p className="px-2.5 pt-1.5 pb-2 text-card-title">Needs attention</p>
          <ul className="flex flex-col">
            {urgent.map((task) => (
              <li key={task.id}>
                <Link
                  href={task.href}
                  className="flex flex-col gap-0.5 rounded-control px-2.5 py-2 hover:bg-surface-hover"
                >
                  <span className="text-micro font-medium text-coral-text">
                    {priorityPresentation[task.priority].label}
                  </span>
                  <span className="text-dense text-fg">{task.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/"
            className="mt-1 block rounded-control border-t border-border px-2.5 py-2 text-dense font-medium text-violet-text hover:bg-surface-hover"
          >
            Open operational inbox
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Help() {
  return (
    <Popover.Root>
      <Popover.Trigger className={iconButton} aria-label="Help and shortcuts">
        <CircleHelp aria-hidden="true" className="size-[18px]" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className={cn(popoverPanel, "w-72 p-3")}>
          <p className="text-card-title">Keyboard shortcuts</p>
          <dl className="mt-2 flex flex-col gap-2 text-dense">
            <div className="flex items-center justify-between">
              <dt className="text-fg-secondary">Search and commands</dt>
              <dd className="flex gap-1">
                <Kbd>Ctrl</Kbd>
                <Kbd>K</Kbd>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-fg-secondary">Filter by type</dt>
              <dd>
                <Kbd>customer:</Kbd>
              </dd>
            </div>
          </dl>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function StaffMenu({ staff }: { staff: StaffUser }) {
  const itemClass =
    "flex h-9 cursor-default items-center gap-2.5 rounded-control px-2.5 text-dense text-fg outline-none data-disabled:text-fg-disabled data-highlighted:bg-surface-hover [&_svg]:size-4 [&_svg]:text-fg-muted";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Staff menu for ${staff.name}`}
        className="inline-flex size-9 items-center justify-center rounded-full bg-ink text-micro font-semibold text-canvas"
      >
        {initials(staff.name)}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className={cn(popoverPanel, "w-72")}>
          <div className="px-2.5 pt-1.5 pb-2.5">
            <p className="text-card-title">{staff.name}</p>
            <p className="text-micro text-fg-muted">{staff.email}</p>
            <p className="mt-1.5 text-micro text-fg-secondary">
              {staff.roles.map((role) => roleName[role]).join(" · ")}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/design-system">
              <Palette aria-hidden="true" />
              Design system
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item disabled className={itemClass}>
            <LogOut aria-hidden="true" />
            Sign out
            <span className="ms-auto text-micro">Identity not connected</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function TopBar({
  environment,
  pendingApprovals,
  tasks,
  staff,
  products,
}: {
  environment: Environment;
  pendingApprovals: number;
  tasks: Task[];
  staff: StaffUser;
  products: Product[];
}) {
  const { setMobileNavOpen } = useShell();
  return (
    <header className="sticky top-0 z-(--z-nav) flex h-topbar shrink-0 items-center gap-3 border-b border-border/80 bg-surface/80 px-4 backdrop-blur-xl backdrop-saturate-150 md:px-6">
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        className={cn(iconButton, "-ms-2 md:hidden")}
        aria-label="Open navigation"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>
      <SearchTrigger />
      <div className="ms-auto flex shrink-0 items-center gap-2 md:gap-3">
        <ProductFilter products={products} />
        <EnvironmentBadge environment={environment} />
        <Link
          href="/approvals?view=team"
          className="hidden h-8 items-center gap-1.5 rounded-control px-2.5 text-dense font-medium text-fg-secondary hover:bg-surface-hover hover:text-fg sm:inline-flex"
        >
          <Stamp aria-hidden="true" className="size-4" />
          <span className="tabular">{pendingApprovals}</span>
          <span>pending</span>
          <span className="sr-only">approvals</span>
        </Link>
        <Notifications tasks={tasks} />
        <Help />
        <StaffMenu staff={staff} />
      </div>
    </header>
  );
}
