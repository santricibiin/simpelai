"use client";

import { motion } from "framer-motion";
import { CalendarDays, Coins, Package, Search, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import type { PublicProduct } from "@/lib/public-products";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function ringkasToken(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} miliar`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} juta`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("id-ID")} ribu`;
  return n.toLocaleString("id-ID");
}

export default function PricelistTable({ products }: { products: PublicProduct[] }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("semua");

  const categories = useMemo(
    () => ["semua", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) => (cat === "semua" || p.category === cat) && (!q || p.name.toLowerCase().includes(q)),
    );
  }, [products, query, cat]);

  if (!products.length) {
    return (
      <div className="glass mx-auto max-w-md p-8 text-center">
        <Package className="mx-auto h-8 w-8 text-crimson-500" />
        <p className="mt-4 font-display text-lg font-semibold">Belum ada produk aktif</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Daftar harga akan muncul di sini begitu produk ditambahkan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <label htmlFor="cari-produk" className="sr-only">
            Cari produk
          </label>
          <input
            id="cari-produk"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari paket…"
            className="w-full rounded-xl border border-slate-900/15 bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15"
          />
        </div>

        {categories.length > 2 && (
          <div role="tablist" aria-label="Filter kategori" className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={cat === c}
                onClick={() => setCat(c)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  cat === c
                    ? "bg-crimson text-offwhite"
                    : "border border-slate-900/15 text-slate-600 hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15 dark:text-slate-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <p className="ml-auto font-mono text-xs text-slate-500 dark:text-slate-400">
          {filtered.length} dari {products.length} produk
        </p>
      </div>

      {/* kartu produk */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p, i) => (
          <motion.li
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.05 }}
            className="glass neon-ring flex flex-col p-5 transition hover:-translate-y-1"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-crimson-500">
                  {p.category}
                </span>
                <h3 className="mt-1 font-display text-lg font-semibold leading-snug">{p.name}</h3>
              </div>
              {p.stock !== null && p.stock <= 5 && (
                <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-500">
                  sisa {p.stock}
                </span>
              )}
            </div>

            <p className="mt-4 font-display text-2xl font-semibold tracking-tight">{rupiah(p.price)}</p>

            <dl className="mt-4 space-y-2 text-sm">
              {p.tokens > 0 && (
                <div className="flex items-center gap-2">
                  <Coins className="h-3.5 w-3.5 shrink-0 text-crimson-500" />
                  <dt className="sr-only">Token</dt>
                  <dd className="text-slate-600 dark:text-slate-300">{ringkasToken(p.tokens)} token</dd>
                </div>
              )}
              {p.validDays > 0 && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-crimson-500" />
                  <dt className="sr-only">Masa aktif</dt>
                  <dd className="text-slate-600 dark:text-slate-300">berlaku {p.validDays} hari</dd>
                </div>
              )}
              {p.soldCount > 0 && (
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-crimson-500" />
                  <dt className="sr-only">Terjual</dt>
                  <dd className="text-slate-600 dark:text-slate-300">{p.soldCount}x terjual</dd>
                </div>
              )}
            </dl>

            <p className="mt-5 rounded-xl bg-crimson/5 px-3 py-2 text-center font-mono text-[11px] text-slate-500 dark:text-slate-400">
              halaman order segera
            </p>
          </motion.li>
        ))}
      </ul>

      {!filtered.length && (
        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Tidak ada produk yang cocok dengan pencarian.
        </p>
      )}
    </div>
  );
}
