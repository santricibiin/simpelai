import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PricelistTable from "@/components/PricelistTable";
import { getPublicProducts } from "@/lib/public-products";
import { getSettings } from "@/lib/session";

export const metadata: Metadata = {
  title: "Daftar Harga",
  description: "Daftar harga paket token AI dan produk lainnya.",
};
export const dynamic = "force-dynamic";

export default async function PricelistPage() {
  const [{ site_name }, products] = await Promise.all([getSettings(), getPublicProducts()]);

  return (
    <>
      <Navbar siteName={site_name} />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-dot-grid bg-[size:22px_22px] opacity-[0.45] [mask-image:radial-gradient(ellipse_at_top,black,transparent_62%)] dark:opacity-[0.3]" />
        <div className="aurora -top-24 left-1/2 h-64 w-[30rem] -translate-x-1/2 bg-crimson/18" />

        <div className="container-x relative py-14 sm:py-20">
          <header className="max-w-2xl">
            <span className="pill text-crimson-500">
              <span className="h-1.5 w-1.5 rounded-full bg-crimson-500" />
              pricelist
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold tracking-tightest sm:text-6xl">
              Daftar <span className="text-gradient">harga</span>
            </h1>
            <p className="mt-5 text-slate-600 dark:text-slate-300">
              Harga berlaku per paket, sekali bayar. Data diambil langsung dari katalog produk yang
              aktif — kalau stok habis, paketnya otomatis hilang dari daftar.
            </p>
          </header>

          <div className="mt-12">
            <PricelistTable products={products} />
          </div>
        </div>
      </main>

      <Footer siteName={site_name} />
    </>
  );
}
