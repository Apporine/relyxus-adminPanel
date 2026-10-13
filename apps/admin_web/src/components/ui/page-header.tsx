import { cn } from "@/lib/cn";

/** Page title (24/32, 600), optional description and the page's action group. */
export function PageHeader({
  title,
  description,
  actions,
  meta,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  /** Primary action last, so it sits at the trailing edge. */
  actions?: React.ReactNode;
  /** Status badges or identifiers shown under the title. */
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        <h1 className="text-page-title text-fg">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-body text-fg-muted">{description}</p>
        ) : null}
        {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
