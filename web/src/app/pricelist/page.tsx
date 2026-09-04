import type { Metadata } from "next";
import { Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PricelistTable from "@/components/PricelistTable";
import { getPublicProducts, getResellerQuotaTokens } from "@/lib/public-products";
import { getSettings } from "@/lib/session";

export const metadata: Metadata = {
  title: "Daftar Harga",
  description: "Daftar harga paket token AI dan produk lainnya.",
};
export const dynamic = "force-dynamic";

const ringkas = (n: number) => {
  if (n >= 1_000_000_000)
    return `${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} miliar`;
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} juta`;
  return n.toLocaleString("id-ID");
};

export default async function PricelistPage() {
  const [{ site_name }, products, kuota] = await Promise.all([
    getSettings(),
    getPublicProducts(),
    getResellerQuotaTokens(),
  ]);

  const adaBandel = products.some((p) => p.source === "bandel");

  return (
    <>
      <Navbar siteName={site_name} />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-dot-grid bg-[size:22px_22px] opacity-[0.45] [mask-image:radial-gradient(ellipse_at_top,black,transparent_62%)] dark:opacity-[0.3]" />
        <div className="aurora -top-24 left-1/2 h-64 w-[30rem] -translate-x-1/2 bg-crimson/18" />

        <div className="container-x relative py-10 sm:py-16 lg:py-20">
          <header className="max-w-2xl">
            <span className="pill text-crimson-500">
              <span className="h-1.5 w-1.5 rounded-full bg-crimson-500" />
              pricelist
            </span>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tightest sm:mt-5 sm:text-5xl lg:text-6xl">
              Daftar <span className="text-gradient">harga</span>
            </h1>
            <p className="mt-4 text-sm text-slate-600 sm:mt-5 sm:text-base dark:text-slate-300">
              Harga berlaku per paket, sekali bayar. Data diambil langsung dari katalog produk yang
              aktif — kalau stok habis, paketnya otomatis hilang dari daftar.
            </p>

            {adaBandel && kuota !== null && (
              <p className="pill mt-5 text-slate-600 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                kuota token siap kirim: {ringkas(kuota)}
              </p>
            )}

            <ul className="mt-6 flex flex-wrap gap-2">
              {["QRIS semua e-wallet", "API key terkirim otomatis", "Tanpa daftar akun"].map((t) => (
                <li key={t} className="pill text-slate-600 dark:text-slate-300">
                  <Check className="h-3 w-3 text-crimson-500" />
                  {t}
                </li>
              ))}
            </ul>
          </header>

          <div className="mt-8 sm:mt-12">
            <PricelistTable products={products} />
          </div>
        </div>
      </main>

      <Footer siteName={site_name} />
    </>
  );
}
