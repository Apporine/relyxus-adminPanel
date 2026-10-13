import { cva, type VariantProps } from "class-variance-authority";
import {
  CircleCheck,
  CircleDashed,
  Info,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Status always pairs text and an icon with color (spec §6 accessibility rule).
 * Tones map to the palette: Cyan marks healthy live state, Violet marks informational
 * emphasis, Coral marks risk; neutral covers everything that needs no attention.
 */
const badgeVariants = cva(
  "inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border px-2 text-micro font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-border-strong bg-surface text-fg-secondary",
        info: "border-transparent bg-violet-subtle text-violet-text",
        healthy: "border-transparent bg-cyan-subtle text-cyan-text",
        risk: "border-coral bg-coral-subtle text-coral-text",
        critical: "border-coral bg-coral text-ink",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

const defaultIcons: Record<BadgeTone, LucideIcon> = {
  neutral: CircleDashed,
  info: Info,
  healthy: CircleCheck,
  risk: TriangleAlert,
  critical: OctagonAlert,
};

export type StatusBadgeProps = Omit<React.ComponentProps<"span">, "children"> & {
  tone?: BadgeTone;
  label: string;
  /** Overrides the tone's default icon. */
  icon?: LucideIcon;
};

export function StatusBadge({
  tone = "neutral",
  label,
  icon,
  className,
  ...props
}: StatusBadgeProps) {
  const Icon = icon ?? defaultIcons[tone];
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      <Icon aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}

/** Plain metadata tag without status meaning, such as a product code or region. */
export function Tag({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-control bg-surface-sunken px-2 text-micro font-medium text-fg-secondary",
        className,
      )}
      {...props}
    />
  );
}
