"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Audit event detail drawer. Open state lives in the URL (`?event=`) so a reviewer can
 * share the exact event; closing removes the parameter and keeps the filters.
 */
export function EventDrawer({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("event");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <DialogPrimitive.Root defaultOpen onOpenChange={(open) => (open ? undefined : close())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-dialog) bg-ink/30 data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed inset-y-0 end-0 z-(--z-dialog) flex w-full max-w-xl flex-col border-s border-border bg-surface shadow-overlay data-[state=open]:animate-drawer-in">
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-section-title text-fg">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-dense text-fg-muted">
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close event detail"
              className="-me-2 inline-flex size-8 shrink-0 items-center justify-center rounded-control text-fg-muted hover:bg-surface-hover hover:text-fg"
            >
              <X aria-hidden="true" className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
