import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Dense enterprise table (spec §6.2). The wrapper scrolls horizontally rather than hiding
 * columns at narrow widths (spec §32); headers stick while the page scrolls.
 */
export function Table({
  className,
  label,
  ...props
}: React.ComponentProps<"table"> & { label: string }) {
  return (
    // A labelled scroll region is keyboard focusable so it can be scrolled without a mouse.
    <div role="region" aria-label={label} tabIndex={0} className="relative w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-dense tabular", className)} {...props} />
    </div>
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("sticky top-0 z-(--z-sticky) bg-surface", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&>tr:last-child]:border-b-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors duration-(--ap-duration-fast) hover:bg-surface-hover",
        "data-[state=selected]:bg-surface-selected",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeaderCell({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "h-9 border-b border-border-strong px-3 text-start align-middle text-micro font-semibold whitespace-nowrap text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

export type SortDirection = "ascending" | "descending" | "none";

/** Header cell with an accessible sort control; the parent owns sort state. */
export function SortableHeaderCell({
  children,
  direction,
  onSort,
  className,
  ...props
}: Omit<React.ComponentProps<"th">, "onClick"> & {
  direction: SortDirection;
  onSort: () => void;
}) {
  const Icon =
    direction === "ascending" ? ArrowUp : direction === "descending" ? ArrowDown : ArrowUpDown;
  return (
    <TableHeaderCell aria-sort={direction} className={cn("px-1.5", className)} {...props}>
      <button
        type="button"
        onClick={onSort}
        className="inline-flex h-7 items-center gap-1 rounded-control px-1.5 hover:bg-surface-hover hover:text-fg"
      >
        {children}
        <Icon aria-hidden="true" className="size-3.5" />
      </button>
    </TableHeaderCell>
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("h-(--spacing-row) px-3 align-middle text-fg-secondary", className)}
      {...props}
    />
  );
}
