import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/cn";

/**
 * Button variants follow spec §6.2: Violet with white text for the primary action,
 * Canvas with an Ink border for secondary, Coral with Ink text for destructive confirmation.
 */
export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap",
    "transition-[color,background-color,border-color,box-shadow,transform] duration-(--ap-duration-fast) ease-standard",
    "active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-violet text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] hover:bg-violet-hover hover:shadow-glow",
        secondary:
          "border border-ink bg-canvas text-ink hover:bg-surface hover:shadow-[0_4px_12px_-6px_rgb(17_10_36/0.35)]",
        ghost: "text-fg-secondary hover:bg-surface-hover hover:text-fg",
        destructive: "bg-coral text-ink hover:bg-coral/85",
        link: "h-auto px-0 text-violet-text underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-dense",
        md: "h-9 px-4 text-body",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (for example a Next.js Link) with button styling. */
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  if (asChild) {
    return <Slot.Root className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  }
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
