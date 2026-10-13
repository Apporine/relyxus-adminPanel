import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const controlBase = [
  "w-full rounded-control border border-border-control bg-surface text-body text-fg",
  "placeholder:text-fg-muted",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-disabled",
  "aria-invalid:border-coral aria-invalid:bg-coral-subtle/40",
].join(" ");

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-dense font-medium text-fg", className)} {...props} />;
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlBase, "h-9 px-3", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(controlBase, "min-h-20 px-3 py-2", className)} {...props} />;
}

/** Native select keeps full keyboard and screen reader behavior with token styling. */
export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(controlBase, "h-9 appearance-none ps-3 pe-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
      />
    </div>
  );
}

export function FieldHint({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-micro text-fg-muted", className)} {...props} />;
}

export function FieldError({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      role="alert"
      className={cn("text-micro font-medium text-coral-text", className)}
      {...props}
    />
  );
}

/** Vertical label, control, hint and error stack. */
export function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}
