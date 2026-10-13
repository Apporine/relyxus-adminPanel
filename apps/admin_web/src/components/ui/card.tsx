import { cn } from "@/lib/cn";

/** Cards use a 10 px radius, thin neutral border and minimal shadow (spec §6.2). */
export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-card border border-border bg-surface shadow-card", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      className={cn("flex min-h-12 items-start justify-between gap-3 px-4 pt-3.5", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  as: Heading = "h2",
  ...props
}: React.ComponentProps<"h2"> & { as?: "h2" | "h3" | "h4" }) {
  return <Heading className={cn("text-card-title text-fg", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("mt-0.5 text-dense text-fg-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-4 pt-3 pb-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer
      className={cn(
        "flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-dense text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}
