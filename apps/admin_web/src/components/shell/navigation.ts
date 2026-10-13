import {
  Activity,
  BarChart3,
  Boxes,
  Building2,
  FileSignature,
  KeyRound,
  LayoutDashboard,
  PackageCheck,
  ScrollText,
  Server,
  Settings,
  Shield,
  Stamp,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** What the module is for; used by the command palette. */
  description: string;
}

/** Primary modules in the order given by spec §7. */
export const primaryNavigation: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: LayoutDashboard,
    description: "Portfolio command center and operational inbox",
  },
  {
    label: "Products",
    href: "/products",
    icon: Boxes,
    description: "Product definitions and release trains",
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Building2,
    description: "Customer 360 and lifecycle",
  },
  {
    label: "Commercial",
    href: "/commercial",
    icon: FileSignature,
    description: "Contracts, subscriptions and renewals",
  },
  {
    label: "Licensing",
    href: "/licensing",
    icon: KeyRound,
    description: "Commercial license lifecycle",
  },
  {
    label: "Deployments",
    href: "/deployments",
    icon: Server,
    description: "Install base and environment governance",
  },
  {
    label: "Releases",
    href: "/releases",
    icon: PackageCheck,
    description: "Release metadata and customer impact",
  },
  {
    label: "Success",
    href: "/success",
    icon: Activity,
    description: "Customer success and support",
  },
  { label: "Approvals", href: "/approvals", icon: Stamp, description: "Governed action queue" },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Reports and saved views",
  },
  {
    label: "Security",
    href: "/security",
    icon: Shield,
    description: "Staff, roles, access reviews and keys",
  },
  {
    label: "Audit",
    href: "/audit",
    icon: ScrollText,
    description: "Searchable administrative evidence",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Control plane configuration",
  },
];

/** True when `pathname` is inside the module rooted at `href`. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
