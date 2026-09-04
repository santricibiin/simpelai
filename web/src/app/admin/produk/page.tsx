import type { Metadata } from "next";
import ProductsManager from "@/components/admin/ProductsManager";
import { BANDEL_TIERS, getProducts } from "@/lib/products";

export const metadata: Metadata = { title: "Produk" };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Produk</h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Kelola produk token yang dijual — stok dari paket provider (top up reseller) atau dari API keys gateway sendiri.
        </p>
      </div>

      <ProductsManager initial={products} tiers={BANDEL_TIERS} />
    </div>
  );
}
