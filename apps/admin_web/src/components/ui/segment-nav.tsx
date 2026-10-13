import Link from "next/link";
import { cn } from "@/lib/cn";

export interface SegmentItem {
  href: string;
  label: string;
  count?: number;
  current: boolean;
}

/** Pill navigation between sibling views of one module; each view is a shareable URL. */
export function SegmentNav({ label, items }: { label: string; items: SegmentItem[] }) {
  return (
    <nav aria-label={label}>
      <ul className="flex w-fit max-w-full scroll-fade-x gap-1 overflow-x-auto rounded-card border border-border bg-surface/70 p-1 shadow-card backdrop-blur-sm">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              scroll={false}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-control px-3 text-dense font-medium whitespace-nowrap text-fg-muted",
                "transition-[color,background-color,box-shadow] duration-(--ap-duration-panel) hover:bg-surface-hover hover:text-fg",
                "aria-[current=page]:bg-ink aria-[current=page]:text-canvas aria-[current=page]:shadow-[0_4px_12px_-6px_rgb(17_10_36/0.6)]",
              )}
            >
              {item.label}
              {item.count === undefined ? null : (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-micro tabular",
                    item.current
                      ? "bg-canvas/15 text-canvas"
                      : "bg-surface-sunken text-fg-secondary",
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
