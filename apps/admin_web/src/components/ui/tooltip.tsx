"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";

/**
 * Supplementary hint only. Critical information and actions never depend on hover
 * (spec §32), so anything inside a tooltip must also be reachable another way.
 */
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-(--z-toast) max-w-xs origin-(--radix-tooltip-content-transform-origin) animate-pop rounded-control bg-ink px-2.5 py-1.5 text-micro text-canvas shadow-overlay"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export const TooltipProvider = TooltipPrimitive.Provider;
