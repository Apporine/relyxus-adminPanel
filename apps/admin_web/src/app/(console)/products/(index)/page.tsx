import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ProductList, ProductListSkeleton } from "@/features/products/product-list";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products"
        description="The Apporine product portfolio. Every product, its customers, entitlements and release train come from product records."
      />
      <Suspense fallback={<ProductListSkeleton />}>
        <ProductList />
      </Suspense>
    </div>
  );
}
