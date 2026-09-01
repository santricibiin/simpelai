import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StockManager from "@/components/admin/StockManager";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = { title: "Kelola Stok" };
export const dynamic = "force-dynamic";

export default async function StockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = (await getProducts()).find((p) => p.id === id && p.source === "manual");

  if (!product) notFound();

  return (
    <StockManager
      productId={product.id}
      product={{
        id: product.id,
        name: product.name,
        productCode: product.productCode,
        category: product.category,
        price: product.price,
        stock: product.stock ?? 0,
        soldCount: product.soldCount ?? 0,
        enabled: product.enabled,
      }}
    />
  );
}
