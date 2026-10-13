/**
 * Global search grammar (spec §7.1). Accepts natural identifiers and structured filters,
 * for example `Acme Bank`, `license:LIC_00421` or `product:relyxus status:active`.
 */

export const searchFilterKeys = [
  "customer",
  "license",
  "deployment",
  "product",
  "status",
  "release",
  "contact",
  "contract",
] as const;

export type SearchFilterKey = (typeof searchFilterKeys)[number];

export interface ParsedQuery {
  text: string;
  filters: Partial<Record<SearchFilterKey, string>>;
}

const filterPattern = new RegExp(`\\b(${searchFilterKeys.join("|")}):("[^"]*"|\\S+)`, "gi");

export function parseSearchQuery(input: string): ParsedQuery {
  const filters: ParsedQuery["filters"] = {};
  const text = input
    .replace(filterPattern, (_, key: string, value: string) => {
      filters[key.toLowerCase() as SearchFilterKey] = value.replace(/^"|"$/g, "").trim();
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
  return { text, filters };
}

export type SearchResultType =
  "customer" | "contact" | "contract" | "license" | "deployment" | "release" | "product";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  /** Text matched against free-text terms. */
  keywords: string[];
  status?: string;
  productCode?: string;
}

export const searchResultTypeLabel: Record<SearchResultType, string> = {
  customer: "Customers",
  contact: "Contacts",
  contract: "Contracts",
  license: "Licenses",
  deployment: "Deployments",
  release: "Releases",
  product: "Products",
};

function includes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/** Filters an index by a parsed query. Results keep index order, grouped by the caller. */
export function matchSearch(index: SearchResult[], query: ParsedQuery): SearchResult[] {
  const { text, filters } = query;
  const typed = (Object.entries(filters) as Array<[SearchFilterKey, string]>).filter(
    ([key]) => key !== "status" && key !== "product",
  );
  if (!text && typed.length === 0 && !filters.status && !filters.product) return [];

  return index.filter((item) => {
    for (const [key, value] of typed) {
      if (item.type !== key) return false;
      if (!item.keywords.some((k) => includes(k, value)) && !includes(item.id, value)) return false;
    }
    if (filters.status && !(item.status && includes(item.status, filters.status))) return false;
    if (filters.product && !(item.productCode && includes(item.productCode, filters.product))) {
      return false;
    }
    if (text) {
      const terms = text.split(" ");
      return terms.every(
        (term) => includes(item.title, term) || item.keywords.some((k) => includes(k, term)),
      );
    }
    return true;
  });
}
