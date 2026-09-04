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
        <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:44px_44px] opacity-[0.25] [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-crimson/15 blur-[110px]" />

        <div className="container-x relative py-14 sm:py-20">
          <header className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-crimson-500">pricelist</span>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tighter sm:text-5xl">
              Daftar <span className="text-crimson-500">harga</span>
            </h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              Harga berlaku per paket, sekali bayar. Data diambil langsung dari katalog produk yang
              aktif — kalau stok habis, paketnya otomatis hilang dari daftar.
            </p>
          </header>

          <div className="mt-10">
            <PricelistTable products={products} />
          </div>
        </div>
      </main>

      <Footer siteName={site_name} />
    </>
  );
}
