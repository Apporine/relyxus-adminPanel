import Link from "next/link";
import { cn } from "@/lib/cn";

export const customerTabs = [
  { id: "overview", label: "Overview" },
  { id: "contacts", label: "Contacts" },
  { id: "products", label: "Products" },
  { id: "contracts", label: "Contracts" },
  { id: "entitlements", label: "Entitlements" },
  { id: "licenses", label: "Licenses" },
  { id: "deployments", label: "Deployments" },
  { id: "usage", label: "Usage" },
  { id: "support", label: "Support" },
  { id: "success", label: "Success" },
  { id: "finance", label: "Finance" },
  { id: "timeline", label: "Timeline" },
  { id: "audit", label: "Audit" },
] as const;

export type CustomerTabId = (typeof customerTabs)[number]["id"];

export function parseCustomerTab(value: string | string[] | undefined): CustomerTabId {
  const raw = Array.isArray(value) ? value[0] : value;
  return customerTabs.find((t) => t.id === raw)?.id ?? "overview";
}

/**
 * Customer 360 sections as links, so every tab has a shareable URL and search results can
 * deep-link (for example `?tab=contacts`). The current section is marked for assistive tech.
 */
export function CustomerTabNav({
  customerId,
  active,
}: {
  customerId: string;
  active: CustomerTabId;
}) {
  return (
    <nav aria-label="Customer sections" className="border-b border-border">
      <ul className="-mb-px flex flex-wrap gap-x-1">
        {customerTabs.map((tab) => (
          <li key={tab.id}>
            <Link
              href={`/customers/${customerId}?tab=${tab.id}`}
              aria-current={tab.id === active ? "page" : undefined}
              scroll={false}
              className={cn(
                "inline-flex h-10 items-center border-b-2 border-transparent px-2.5 text-body font-medium whitespace-nowrap text-fg-muted transition-[color,border-color] duration-(--ap-duration-panel) hover:border-border-strong hover:text-fg",
                "aria-[current=page]:border-violet aria-[current=page]:text-fg",
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
