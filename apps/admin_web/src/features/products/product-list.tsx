import { ArrowRight, Boxes } from "lucide-react";
import Link from "next/link";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/feedback";
import { latestReleased } from "@/domain/fleet";
import { productSummary } from "@/domain/products";
import { productStatus } from "@/domain/status";
import { formatMoneyList } from "@/lib/format";
import { loadCommercial } from "../commercial/load";

/**
 * Product portfolio (spec §9). Products are records, so a new product appears here
 * without a new top-level application.
 */
export async function ProductList() {
  const data = await loadCommercial();
  return (
    <ul className="grid stagger gap-4 lg:grid-cols-2">
      {data.products.map((product) => {
        const summary = productSummary(product, data);
        const latest = latestReleased(product.id, data.releases);
        return (
          <li key={product.id}>
            <article
              aria-labelledby={`product-${product.id}`}
              className="group relative overflow-hidden rounded-card border border-border bg-surface p-5 shadow-card transition-[transform,box-shadow,border-color] duration-(--ap-duration-panel) hover:-translate-y-0.5 hover:border-violet/30 hover:shadow-lift"
            >
              <div
                aria-hidden="true"
                className="absolute -end-10 -top-10 size-40 rounded-full bg-linear-to-br from-violet/15 to-cyan/10 blur-2xl transition-transform duration-500 group-hover:scale-125"
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-violet to-chart-primary-strong text-white shadow-glow"
                  >
                    <Boxes className="size-5" />
                  </span>
                  <div>
                    <h2 id={`product-${product.id}`} className="text-section-title text-fg">
                      <Link
                        href={`/products/${product.id}`}
                        className="after:absolute after:inset-0 after:rounded-card hover:text-violet-text"
                      >
                        {product.name}
                      </Link>
                    </h2>
                    <p className="font-mono text-micro text-fg-muted">{product.code}</p>
                  </div>
                </div>
                <StatusBadge
                  tone={productStatus[product.status].tone}
                  label={productStatus[product.status].label}
                />
              </div>
              <p className="relative mt-3 text-dense text-fg-secondary">{product.supportModel}</p>
              <dl className="relative mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Customers", String(summary.activeCustomers)],
                  ["Deployments", String(summary.deployments)],
                  ["Release train", product.currentReleaseTrain],
                  ["Latest release", latest?.version ?? "—"],
                ].map(([term, value]) => (
                  <div key={term} className="rounded-control bg-surface-sunken/70 px-3 py-2">
                    <dt className="text-micro text-fg-muted">{term}</dt>
                    <dd className="text-body font-semibold text-fg tabular">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 text-dense">
                <span className="text-fg-secondary">
                  Owner {data.staff[product.ownerId]?.name ?? product.ownerId}
                  {data.canViewCommercial && summary.annualContractValue.length ? (
                    <Tag className="ms-2">{formatMoneyList(summary.annualContractValue)}</Tag>
                  ) : null}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-violet-text">
                  Open product
                  <ArrowRight
                    aria-hidden="true"
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export function ProductListSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-56 rounded-card" />
      ))}
    </div>
  );
}
