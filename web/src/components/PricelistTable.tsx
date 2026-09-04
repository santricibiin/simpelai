"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Coins,
  LayoutGrid,
  List,
  Package,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { PublicProduct } from "@/lib/public-products";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function ringkasToken(n: number) {
  if (n >= 1_000_000_000)
    return `${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("id-ID")} rb`;
  return n.toLocaleString("id-ID");
}

/** Harga per 1 juta token — buat bandingin paket secara adil. */
function per1M(p: PublicProduct) {
  if (p.tokens <= 0 || p.price <= 0) return null;
  const rate = p.price / (p.tokens / 1_000_000);
  if (rate < 1) return "<1";
  return rate.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

type Sort = "termurah" | "termahal" | "token" | "populer";

const sorts: { id: Sort; label: string }[] = [
  { id: "termurah", label: "Harga termurah" },
  { id: "termahal", label: "Harga tertinggi" },
  { id: "token", label: "Token terbanyak" },
  { id: "populer", label: "Paling banyak terjual" },
];

export default function PricelistTable({ products }: { products: PublicProduct[] }) {
  const still = useReducedMotion();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("semua");
  const [sort, setSort] = useState<Sort>("termurah");
  const [view, setView] = useState<"grid" | "list">("grid");

  const categories = useMemo(
    () => ["semua", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = products.filter(
      (p) => (cat === "semua" || p.category === cat) && (!q || p.name.toLowerCase().includes(q)),
    );

    const cmp: Record<Sort, (a: PublicProduct, b: PublicProduct) => number> = {
      termurah: (a, b) => a.price - b.price,
      termahal: (a, b) => b.price - a.price,
      token: (a, b) => b.tokens - a.tokens,
      populer: (a, b) => b.soldCount - a.soldCount,
    };
    // yang tidak tersedia selalu di bawah, apa pun urutannya
    return [...rows].sort(
      (a, b) => Number(b.available) - Number(a.available) || cmp[sort](a, b),
    );
  }, [products, query, cat, sort]);

  // rasio token/harga terbaik = paling worth it (hanya yang bisa dipesan)
  const bestId = useMemo(() => {
    const eligible = products.filter((p) => p.available && p.tokens > 0 && p.price > 0);
    if (eligible.length < 2) return null;
    return eligible.reduce((best, p) => (p.tokens / p.price > best.tokens / best.price ? p : best)).id;
  }, [products]);

  const habis = products.filter((p) => !p.available).length;

  const resetFilter = () => {
    setQuery("");
    setCat("semua");
  };
  const filterAktif = query.trim() !== "" || cat !== "semua";

  if (!products.length) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center sm:p-10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-crimson/10 text-crimson-500 ring-1 ring-inset ring-crimson/20">
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
    <div className="space-y-6">
      {/* ---------- toolbar: sticky, adaptif ---------- */}
      <div className="sticky top-16 z-30 -mx-4 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-3xl sm:px-4">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-offwhite/80 sm:rounded-3xl sm:border sm:border-slate-900/[.07] dark:bg-slateDeep-900/80 dark:sm:border-white/[.07]" />

        <div className="flex flex-col gap-3">
          {/* baris 1: cari + urutkan + view */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <label htmlFor="cari-produk" className="sr-only">
                Cari produk
              </label>
              <input
                id="cari-produk"
                type="search"
                inputMode="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari paket…"
                className="h-11 w-full rounded-xl border border-slate-900/[.09] bg-white/70 pl-9 pr-9 text-sm outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/25 dark:border-white/[.09] dark:bg-white/[.04]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Hapus pencarian"
                  className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:text-crimson-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <label htmlFor="urutkan" className="sr-only">
              Urutkan
            </label>
            <select
              id="urutkan"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-900/[.09] bg-white/70 px-3 text-sm outline-none transition focus:border-crimson-500 sm:max-w-[12.5rem] sm:flex-none dark:border-white/[.09] dark:bg-white/[.04]"
            >
              {sorts.map((s) => (
                <option key={s.id} value={s.id} className="text-slate-900">
                  {s.label}
                </option>
              ))}
            </select>

            {/* toggle tampilan — hanya layar lebar */}
            <div
              role="group"
              aria-label="Tampilan"
              className="hidden shrink-0 items-center gap-0.5 rounded-xl bg-slate-900/[.05] p-1 lg:flex dark:bg-white/[.05]"
            >
              {(
                [
                  { id: "grid", Icon: LayoutGrid, label: "Kartu" },
                  { id: "list", Icon: List, label: "Tabel" },
                ] as const
              ).map(({ id, Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-pressed={view === id}
                  title={label}
                  className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                    view === id
                      ? "bg-crimson text-offwhite"
                      : "text-slate-500 hover:text-crimson-500 dark:text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="sr-only">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* baris 2: kategori (scroll-x di HP) + jumlah */}
          {(categories.length > 2 || filterAktif) && (
            <div className="flex items-center gap-3">
              {categories.length > 2 && (
                <div
                  role="tablist"
                  aria-label="Filter kategori"
                  className="-mx-1 flex min-w-0 flex-1 snap-x gap-1.5 overflow-x-auto px-1 pb-0.5 sm:flex-wrap sm:overflow-visible"
                >
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="tab"
                      aria-selected={cat === c}
                      onClick={() => setCat(c)}
                      className={`h-9 shrink-0 snap-start whitespace-nowrap rounded-xl px-3.5 text-xs font-semibold transition ${
                        cat === c
                          ? "bg-crimson text-offwhite"
                          : "border border-slate-900/[.09] text-slate-600 hover:border-crimson-500 hover:text-crimson-500 dark:border-white/[.09] dark:text-slate-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              <p className="ml-auto hidden shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400 sm:block dark:text-slate-500">
                {filtered.length}/{products.length} produk
                {habis > 0 && <span className="text-amber-500"> · {habis} habis</span>}
              </p>

              {filterAktif && (
                <button
                  type="button"
                  onClick={resetFilter}
                  className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-crimson-500 underline-offset-4 hover:underline"
                >
                  reset
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---------- tabel (desktop, opsional) ---------- */}
      {view === "list" ? (
        <div className="card hidden overflow-hidden lg:block">
          <table className="w-full text-sm">
            <caption className="sr-only">Daftar harga produk</caption>
            <thead>
              <tr className="border-b border-slate-900/[.07] text-left font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:border-white/[.07] dark:text-slate-500">
                <th scope="col" className="px-5 py-3.5 font-normal">
                  Produk
                </th>
                <th scope="col" className="px-5 py-3.5 font-normal">
                  Token
                </th>
                <th scope="col" className="px-5 py-3.5 font-normal">
                  Masa aktif
                </th>
                <th scope="col" className="px-5 py-3.5 font-normal">
                  Terjual
                </th>
                <th scope="col" className="px-5 py-3.5 text-right font-normal">
                  Harga
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-slate-900/[.05] transition last:border-0 hover:bg-crimson/[.03] dark:border-white/[.05] ${
                    p.available ? "" : "opacity-55"
                  }`}
                >
                  <th scope="row" className="max-w-xs px-5 py-4 text-left font-normal">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-display font-semibold tracking-tight">{p.name}</span>
                      {p.id === bestId && (
                        <span className="shrink-0 rounded-full bg-crimson px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-offwhite">
                          best
                        </span>
                      )}
                      {!p.available && (
                        <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-amber-500">
                          habis
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-crimson-500">
                      {p.category}
                      {!p.available && p.reason && (
                        <span className="text-amber-500"> · {p.reason}</span>
                      )}
                    </span>
                  </th>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {p.tokens > 0 ? `${ringkasToken(p.tokens)} token` : "—"}
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {p.validDays > 0 ? `${p.validDays} hari` : "—"}
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {p.soldCount > 0 ? `${p.soldCount}x` : "—"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-display text-base font-semibold tracking-tight">
                      {rupiah(p.price)}
                    </span>
                    {per1M(p) && (
                      <span className="mt-0.5 block font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        Rp{per1M(p)}/1jt token
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* ---------- grid kartu (semua ukuran; desktop bisa diganti tabel) ---------- */}
      <ul
        className={`grid gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-3 ${
          view === "list" ? "lg:hidden" : ""
        }`}
      >
        {filtered.map((p, i) => {
          const featured = p.id === bestId;
          const rate = per1M(p);

          return (
            <motion.li
              key={p.id}
              initial={still ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45, delay: Math.min(i, 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className={`card card-edge group flex flex-col p-5 sm:p-6 ${
                p.available ? "card-hover" : "opacity-60 saturate-50"
              } ${featured ? "border-crimson/30 ring-1 ring-crimson/20" : ""}`}
            >
              {/* header: kategori + badge */}
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-crimson-500">
                  {p.category}
                </span>
                {featured && (
                  <span className="shrink-0 rounded-full bg-crimson px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-offwhite">
                    best value
                  </span>
                )}
                {!p.available && (
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-amber-500">
                    habis
                  </span>
                )}
              </div>

              <h3 className="mt-2 font-display text-base font-semibold leading-snug tracking-tight sm:text-lg">
                {p.name}
              </h3>

              {/* harga + rate */}
              <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="font-display text-2xl font-semibold tracking-tightest sm:text-3xl">
                  {rupiah(p.price)}
                </p>
                {rate && (
                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                    ≈Rp{rate}/1jt token
                  </span>
                )}
              </div>

              <div className="hairline my-4 sm:my-5" />

              {/* spesifikasi */}
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-1">
                {p.tokens > 0 && (
                  <div className="flex items-center gap-2">
                    <Coins className="h-3.5 w-3.5 shrink-0 text-crimson-500" />
                    <dt className="sr-only">Token</dt>
                    <dd className="min-w-0 truncate text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {ringkasToken(p.tokens)}
                      </span>{" "}
                      token
                    </dd>
                  </div>
                )}
                {p.validDays > 0 && (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-crimson-500" />
                    <dt className="sr-only">Masa aktif</dt>
                    <dd className="min-w-0 truncate text-slate-600 dark:text-slate-300">
                      {p.validDays} hari
                    </dd>
                  </div>
                )}
                {p.soldCount > 0 && (
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-crimson-500" />
                    <dt className="sr-only">Terjual</dt>
                    <dd className="min-w-0 truncate text-slate-600 dark:text-slate-300">
                      {p.soldCount}x terjual
                    </dd>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {p.available ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-crimson-500" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  )}
                  <dt className="sr-only">Ketersediaan</dt>
                  <dd
                    className={`min-w-0 truncate ${
                      !p.available || (p.stock !== null && p.stock <= 5)
                        ? "font-semibold text-amber-500"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {!p.available
                      ? (p.reason ?? "tidak tersedia")
                      : p.source === "bandel"
                        ? "kuota tersedia"
                        : p.stock === null
                          ? "stok tersedia"
                          : `sisa ${p.stock}`}
                  </dd>
                </div>
              </dl>

              <div className="mt-auto pt-5">
                <p
                  className={`rounded-xl border border-dashed py-2.5 text-center font-mono text-[11px] ${
                    p.available
                      ? "border-slate-900/[.12] text-slate-500 dark:border-white/[.12] dark:text-slate-400"
                      : "border-amber-500/30 text-amber-500"
                  }`}
                >
                  {p.available ? "halaman order segera" : "stok menyusul"}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ul>

      {!filtered.length && (
        <div className="card p-10 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Tidak ada produk yang cocok dengan filter.
          </p>
          <button
            type="button"
            onClick={resetFilter}
            className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-crimson-500 underline-offset-4 hover:underline"
          >
            reset filter
          </button>
        </div>
      )}

      <p className="text-center font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400 sm:hidden dark:text-slate-500">
        {filtered.length}/{products.length} produk
      </p>
    </div>
  );
}
