"use client";

import { AlertTriangle, ArrowLeft, Boxes, Check, CheckSquare, Loader2, Plus, Square, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const nf = new Intl.NumberFormat("id-ID");

export default function StockManager({
  productId,
  product,
}: {
  productId: string;
  product: { id: string; name: string; productCode?: string; category?: string; price: number; stock: number; soldCount?: number; enabled: boolean };
}) {
  const router = useRouter();
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<"add" | "remove" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stockCount, setStockCount] = useState(product.stock);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/stock`, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) throw new Error("Gagal memuat stok.");
      const data = await res.json();
      setItems(data.items ?? []);
      setStockCount(data.stock ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat stok.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (item: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });

  const addStock = async () => {
    if (!input.trim()) return;
    setBusy("add");
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: input }),
      }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Gagal (HTTP ${res.status}).`);
      setMsg(`✓ ${data.added} stok ditambah${data.duplicates ? ` · ${data.duplicates} duplikat dilewati` : ""}`);
      setInput("");
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah stok.");
    } finally {
      setBusy(null);
    }
  };

  const removeSelected = async () => {
    if (selected.size === 0) return;
    setBusy("remove");
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/stock`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [...selected].join("\n") }),
      }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Gagal (HTTP ${res.status}).`);
      setMsg(`✓ ${data.removed} stok dihapus`);
      setSelected(new Set());
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus stok.");
    } finally {
      setBusy(null);
    }
  };

  const filtered = items.filter((i) => !search || i.toLowerCase().includes(search.toLowerCase()));
  const validLines = input.split(/\r?\n/).filter((l) => l.trim() && l.includes(":")).length;

  const field =
    "w-full rounded-xl border border-slate-900/15 bg-transparent px-3.5 py-2.5 text-sm outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15";
  const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <a
            href="/admin/produk"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-crimson-500 dark:text-slate-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            kembali ke katalog
          </a>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{product.name}</h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            {[product.category, product.productCode].filter(Boolean).join(" · ")} · Rp{nf.format(product.price)} ·{" "}
            {product.soldCount ?? 0} terjual
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase ${
              product.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"
            }`}
          >
            {product.enabled ? "aktif" : "nonaktif"}
          </span>
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Stok tersedia", value: nf.format(stockCount) },
          { label: "Terpilih", value: `${selected.size} item` },
          { label: "Total terjual", value: nf.format(product.soldCount ?? 0) },
        ].map((c) => (
          <li key={c.label} className="glass p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              {c.label}
            </p>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{c.value}</p>
          </li>
        ))}
      </ul>

      <section className="glass p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-crimson-500">
            <Boxes className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Daftar stok</h2>
            <span className="rounded-full bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] normal-case tracking-normal text-slate-400">
              {filtered.length} / {items.length} item
            </span>
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari stok…"
              className="w-40 rounded-lg border border-slate-900/15 bg-transparent px-3 py-1.5 text-xs outline-none transition focus:border-crimson-500 dark:border-white/15"
            />
            <button
              type="button"
              onClick={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-xs font-medium transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
            >
              {selected.size === filtered.length && filtered.length > 0 ? (
                <CheckSquare className="h-3.5 w-3.5" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              {selected.size === filtered.length && filtered.length > 0 ? "Batal pilih" : "Pilih semua"}
            </button>
            <button
              type="button"
              onClick={removeSelected}
              disabled={busy !== null || selected.size === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-crimson/40 px-2.5 py-1.5 text-xs font-semibold text-crimson-500 transition hover:bg-crimson/10 disabled:opacity-50"
            >
              {busy === "remove" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Hapus terpilih{selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
          </div>
        </header>

        {msg && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-400">
            <Check className="h-4 w-4 shrink-0" />
            {msg}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs text-crimson-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-900/[.06] dark:bg-white/[.06]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Boxes className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-medium">{items.length === 0 ? "Belum ada stok" : "Tidak ada stok cocok"}</p>
              <p className="mt-1 text-xs text-slate-400">
                {items.length === 0 ? "Tambahkan stok lewat form di bawah." : "Coba kata kunci lain."}
              </p>
            </div>
          ) : (
            <ul className="grid gap-1.5 xl:grid-cols-2">
              {filtered.map((item, i) => {
                const checked = selected.has(item);
                return (
                  <li key={`${i}-${item}`}>
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition ${
                        checked
                          ? "border-crimson/40 bg-crimson/5"
                          : "border-slate-900/10 hover:border-crimson-500/30 dark:border-white/10"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item)}
                        className="h-3.5 w-3.5 shrink-0 accent-crimson"
                      />
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{item}</span>
                      <span className="shrink-0 font-mono text-[10px] text-slate-400">#{i + 1}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="glass p-5">
        <header className="flex items-center gap-2 text-crimson-500">
          <Plus className="h-4 w-4" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Tambah stok</h2>
        </header>
        <label className="mt-4 block">
          <span className={labelCls}>
            email:password per baris (1 baris = 1 stok
            {input.trim() ? ` · ${validLines} baris valid` : ""})
          </span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"email1@gmail.com:password123\nemail2@gmail.com:password456"}
            rows={7}
            spellCheck={false}
            className={`${field} font-mono text-[11px]`}
          />
          <span className="mt-1.5 block text-[11px] text-slate-500 dark:text-slate-400">
            Duplikat otomatis dilewati — stok baru langsung muncul di daftar atas.
          </span>
        </label>
        <button
          type="button"
          onClick={addStock}
          disabled={busy !== null || validLines === 0}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite shadow-neon transition hover:bg-crimson-600 disabled:opacity-50"
        >
          {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {busy === "add" ? "Menambahkan…" : `Tambah ${validLines > 0 ? `${validLines} stok` : "stok"}`}
        </button>
      </section>
    </div>
  );
}
