"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/use-hydrated";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDefinition {
  name: string;
  label: string;
  /** Label of the "no filter" option, such as "All products". */
  allLabel?: string;
  options: FilterOption[];
}

/**
 * Filter bar pinned below the header (spec §8.1, §30.1). Filters live in the URL so views
 * are shareable; while the next result loads, the current frame stays at reduced opacity
 * instead of flashing a skeleton.
 */
export function FilterFrame({
  label,
  filters,
  values,
  search,
  children,
}: {
  /** Accessible name of the filter form, such as "Portfolio filters". */
  label: string;
  filters: FilterDefinition[];
  values: Record<string, string | undefined>;
  /** Optional free-text search, applied on Enter. */
  search?: { name: string; label: string; placeholder: string };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();

  function navigate(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    const query = params.toString();
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }),
    );
  }

  const active =
    filters.some((f) => f.allLabel && values[f.name]) || Boolean(search && values[search.name]);

  return (
    <>
      <form
        role="search"
        aria-label={label}
        data-hydrated={hydrated}
        className="sticky top-topbar z-(--z-sticky) -mx-4 flex flex-wrap items-end gap-3 border-b border-border bg-canvas/95 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (!search) return;
          const term = new FormData(event.currentTarget).get(search.name);
          navigate({
            ...values,
            [search.name]: typeof term === "string" && term.trim() ? term.trim() : undefined,
          });
        }}
      >
        {search ? (
          <div className="flex w-64 flex-col gap-1">
            <label
              htmlFor={`filter-${search.name}`}
              className="text-micro font-medium text-fg-muted"
            >
              {search.label}
            </label>
            <Input
              id={`filter-${search.name}`}
              name={search.name}
              type="search"
              defaultValue={values[search.name] ?? ""}
              placeholder={search.placeholder}
              className="h-8 text-dense"
            />
          </div>
        ) : null}
        {filters.map((filter) => (
          <div key={filter.name} className="flex w-36 flex-col gap-1">
            <label
              htmlFor={`filter-${filter.name}`}
              className="text-micro font-medium text-fg-muted"
            >
              {filter.label}
            </label>
            <Select
              id={`filter-${filter.name}`}
              name={filter.name}
              value={values[filter.name] ?? ""}
              onChange={(event) =>
                navigate({ ...values, [filter.name]: event.target.value || undefined })
              }
              className="h-8 text-dense"
            >
              {filter.allLabel ? <option value="">{filter.allLabel}</option> : null}
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        ))}
        {active ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              // Keep filters that always have a value (no "all" option), such as a date range.
              navigate(
                Object.fromEntries(
                  filters.filter((f) => !f.allLabel).map((f) => [f.name, values[f.name]]),
                ),
              )
            }
            className="mb-0"
          >
            Clear filters
          </Button>
        ) : null}
        <span aria-live="polite" className="sr-only">
          {pending ? "Updating results" : ""}
        </span>
      </form>
      <div
        aria-busy={pending}
        className={cn("transition-opacity duration-(--ap-duration-panel)", pending && "opacity-60")}
      >
        {children}
      </div>
    </>
  );
}
