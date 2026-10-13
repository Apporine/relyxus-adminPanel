import { cn } from "@/lib/cn";

export interface DescriptionItem {
  term: string;
  /** Missing values render as "Not recorded" so gaps are visible, not blank. */
  value?: React.ReactNode;
}

/** Key-value metadata for detail pages. */
export function DescriptionList({
  items,
  columns = 1,
  className,
}: {
  items: DescriptionItem[];
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3", columns === 2 && "sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.term} className="min-w-0">
          <dt className="text-micro text-fg-muted">{item.term}</dt>
          <dd className="mt-0.5 text-dense break-words text-fg">
            {item.value === undefined || item.value === null || item.value === "" ? (
              <span className="text-fg-muted italic">Not recorded</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
