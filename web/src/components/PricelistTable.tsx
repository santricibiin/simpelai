"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Coins, Package, Search, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import type { PublicProduct } from "@/lib/public-products";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function ringkasToken(n: number) {
  if (n >= 1_000_000_000)
    return `${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} miliar`;
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} juta`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("id-ID")} ribu`;
  return n.toLocaleString("id-ID");
}

export default function PricelistTable({ products }: { products: PublicProduct[] }) {
  const still = useReducedMotion();
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

  // paket termurah dengan token terbanyak = paling menarik
  const bestId = useMemo(() => {
    const withTokens = products.filter((p) => p.tokens > 0 && p.price > 0);
    if (withTokens.length < 2) return null;
    return withTokens.reduce((best, p) =>
      p.tokens / p.price > best.tokens / best.price ? p : best,
    ).id;
  }, [products]);

  if (!products.length) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-crimson/10 text-crimson-500 ring-1 ring-inset ring-crimson/15">
          <Package className="h-6 w-6" />
        </span>
        <p className="mt-5 font-display text-lg font-semibold tracking-tight">Belum ada produk aktif</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Daftar harga akan muncul di sini begitu produk ditambahkan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* toolbar */}
      <div className="card flex flex-wrap items-center gap-3 p-3 sm:p-4">
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
            className="w-full rounded-xl border border-slate-900/[.07] bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/25 dark:border-white/[.07]"
          />
        </div>

        {categories.length > 2 && (
          <div
            role="tablist"
            aria-label="Filter kategori"
            className="flex flex-wrap gap-1 rounded-xl bg-slate-900/[.04] p-1 dark:bg-white/[.04]"
          >
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={cat === c}
                onClick={() => setCat(c)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition duration-300 ${
                  cat === c
                    ? "bg-crimson text-offwhite shadow-neon"
                    : "text-slate-500 hover:text-crimson-500 dark:text-slate-400"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <p className="ml-auto shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {filtered.length}/{products.length} produk
        </p>
      </div>

      {/* grid produk */}
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p, i) => {
          const featured = p.id === bestId;
          return (
            <motion.li
              key={p.id}
              initial={still ? false : { opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: Math.min(i, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className={`card card-hover card-edge group flex flex-col p-6 ${
                featured ? "border-crimson/30 ring-1 ring-crimson/15" : ""
              }`}
            >
              {featured && (
                <span className="absolute right-5 top-5 rounded-full bg-crimson px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-offwhite">
                  best value
                </span>
              )}

              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-crimson-500">
                {p.category}
              </span>

              <h3 className="mt-2 max-w-[85%] font-display text-lg font-semibold leading-snug tracking-tight">
                {p.name}
              </h3>

              <p className="mt-5 font-display text-3xl font-semibold tracking-tightest">
                {rupiah(p.price)}
              </p>

              <div className="hairline my-5" />

              <dl className="space-y-2.5 text-sm">
                {p.tokens > 0 && (
                  <div className="flex items-center gap-2.5">
                    <Coins className="h-3.5 w-3.5 shrink-0 text-crimson-500" />
                    <dt className="sr-only">Token</dt>
                    <dd className="text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {ringkasToken(p.tokens)}
                      </span>{" "}
                      token
                    </dd>
                  </div>
                )}
                {p.validDays > 0 && (
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-crimson-500" />
                    <dt className="sr-only">Masa aktif</dt>
                    <dd className="text-slate-600 dark:text-slate-300">berlaku {p.validDays} hari</dd>
                  </div>
                )}
                {p.soldCount > 0 && (
                  <div className="flex items-center gap-2.5">
                    <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-crimson-500" />
                    <dt className="sr-only">Terjual</dt>
                    <dd className="text-slate-600 dark:text-slate-300">{p.soldCount}x terjual</dd>
                  </div>
                )}
              </dl>

              <div className="mt-auto pt-6">
                {p.stock !== null && p.stock <= 5 && (
                  <p className="mb-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-amber-500">
                    stok tersisa {p.stock}
                  </p>
                )}
                <p className="rounded-xl border border-dashed border-slate-900/[.12] py-2.5 text-center font-mono text-[11px] text-slate-500 dark:border-white/[.12] dark:text-slate-400">
                  halaman order segera
                </p>
              </div>
            </motion.li>
          );
        })}
      </ul>

      {!filtered.length && (
        <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          Tidak ada produk yang cocok dengan pencarian.
        </p>
      )}
    </div>
  );
}
