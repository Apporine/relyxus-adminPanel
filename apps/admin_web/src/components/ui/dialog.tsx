"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/cn";

/**
 * Modal dialog (spec §32): traps focus, requires a title and description, and returns
 * focus to the invoking control. Pass `dismissible={false}` for flows where Escape or an
 * outside click could lose entered reasons.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  title: string;
  description: React.ReactNode;
  dismissible?: boolean;
  size?: "md" | "lg";
};

export function DialogContent({
  title,
  description,
  dismissible = true,
  size = "md",
  className,
  children,
  onEscapeKeyDown,
  onPointerDownOutside,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-dialog) bg-ink/40 backdrop-blur-[3px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed start-1/2 top-[12vh] z-(--z-dialog) flex max-h-[76vh] w-[calc(100vw-2rem)] -translate-x-1/2 flex-col rounded-dialog border border-border bg-surface shadow-overlay rtl:translate-x-1/2",
          "data-[state=closed]:animate-pop-out data-[state=open]:animate-pop",
          size === "md" ? "max-w-lg" : "max-w-2xl",
          className,
        )}
        onEscapeKeyDown={(event) => {
          if (!dismissible) event.preventDefault();
          onEscapeKeyDown?.(event);
        }}
        onPointerDownOutside={(event) => {
          if (!dismissible) event.preventDefault();
          onPointerDownOutside?.(event);
        }}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            <DialogPrimitive.Title className="text-section-title text-fg">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 text-body text-fg-secondary">
              {description}
            </DialogPrimitive.Description>
          </div>
          <DialogPrimitive.Close
            aria-label="Close dialog"
            className="-me-2 inline-flex size-8 shrink-0 items-center justify-center rounded-control text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            <X aria-hidden="true" className="size-4" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-4 overflow-y-auto px-6 py-5", className)} {...props} />
  );
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-border bg-canvas px-6 py-3.5",
        "rounded-b-dialog",
        className,
      )}
      {...props}
    />
  );
}
