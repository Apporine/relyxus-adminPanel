import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductDetail, ProductDetailSkeleton } from "@/features/products/product-detail";

export async function generateMetadata({ params }: PageProps<"/products/[id]">): Promise<Metadata> {
  return { title: (await params).id };
}

export default function ProductPage({ params, searchParams }: PageProps<"/products/[id]">) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}
