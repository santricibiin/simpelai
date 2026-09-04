"use client";

import {
  AlertTriangle,
  Boxes,
  Check,
  Coins,
  Layers,
  Loader2,
  Package,
  Pencil,
  Plus,
  Power,
  Router,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Modal from "./Modal";
import type { Product } from "@/lib/products";

type Tier = { id: string; label: string; tokens: number; validDays: number };

const nf = new Intl.NumberFormat("id-ID");
const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);
const rupiah = (n: number) => `Rp${nf.format(n)}`;

const VALID_DAYS = [7, 14, 21, 28];

const tokenTier = (n: number) => (n >= 1_000_000_000 ? "elite" : n >= 100_000_000 ? "pro" : n >= 10_000_000 ? "plus" : "basic");

const tierStyle: Record<string, { ring: string; badge: string; glow: string; label: string }> = {
  basic: { ring: "border-slate-900/10 dark:border-white/10", badge: "bg-slate-500/10 text-slate-400", glow: "", label: "Basic" },
  plus: { ring: "border-sky-500/30", badge: "bg-sky-500/10 text-sky-400", glow: "shadow-[0_0_24px_-8px_rgba(56,189,248,.35)]", label: "Plus" },
  pro: { ring: "border-violet-500/30", badge: "bg-violet-500/10 text-violet-400", glow: "shadow-[0_0_24px_-8px_rgba(167,139,250,.35)]", label: "Pro" },
  elite: { ring: "border-crimson/40", badge: "bg-crimson/10 text-crimson-400", glow: "shadow-[0_0_28px_-8px_rgba(220,38,38,.4)]", label: "Elite" },
};

export default function ProductsManager({ initial, tiers }: { initial: Product[]; tiers: Tier[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initial);

  const [form, setForm] = useState({
    name: "",
    source: "bandel" as "bandel" | "gateway" | "manual",
    tierId: tiers[0]?.id ?? "5m",
    tokens: "1000000",
    validDays: "7",
    price: "",
    promoBadge: "",
    stock: "",
    unlimited: true,
    gatewayPreset: "custom" as string,
    category: "",
    productCode: "",
    stockItems: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "bandel" | "gateway" | "manual" | "aktif" | "nonaktif">("all");

  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editPromo, setEditPromo] = useState("");
  const [editStock, setEditStock] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const [delTarget, setDelTarget] = useState<Product | null>(null);

  // kelola stok manual dialihkan ke halaman /admin/produk/[id]/stok

  const call = async (path: string, init?: RequestInit) => {
    const res = await fetch(`/api/admin/products${path}`, init).catch(() => null);
    if (!res) throw new Error("Tidak dapat menghubungi server.");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? `Gagal (HTTP ${res.status}).`);
    return data;
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        source: form.source,
        price: Number(form.price) || 0,
        promoBadge: form.promoBadge.trim() || null,
      };
      if (form.source === "bandel") payload.tierId = form.tierId;
      else if (form.source === "gateway") {
        payload.tokens = Number(form.tokens);
        payload.validDays = Number(form.validDays);
        payload.stock = form.unlimited ? null : Number(form.stock);
      } else {
        payload.category = form.category;
        payload.productCode = form.productCode;
        payload.stockItems = form.stockItems;
      }

      const created = await call("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setProducts((p) => [...p, created as Product]);
      setForm({ ...form, name: "", price: "", promoBadge: "", stock: "", stockItems: "", unlimited: true });
      router.refresh();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Gagal menambah produk.");
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (p: Product) => {
    setBusy(`toggle-${p.id}`);
    setError(null);
    try {
      const updated = await call(`/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !p.enabled }),
      });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? (updated as Product) : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengubah status.");
    } finally {
      setBusy(null);
    }
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setBusy("edit");
    setModalError(null);
    try {
      const payload: Record<string, unknown> = { name: editName.trim(), price: Number(editPrice) || 0, promoBadge: editPromo.trim() || null };
      if (editTarget.source === "gateway") payload.stock = editStock === "" ? null : Number(editStock);
      const updated = await call(`/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setProducts((prev) => prev.map((x) => (x.id === editTarget.id ? (updated as Product) : x)));
      setEditTarget(null);
      router.refresh();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!delTarget) return;
    setBusy("del");
    setModalError(null);
    try {
      await call(`/${delTarget.id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((x) => x.id !== delTarget.id));
      setDelTarget(null);
      router.refresh();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Gagal menghapus.");
    } finally {
      setBusy(null);
    }
  };

  const field =
    "w-full rounded-xl border border-slate-900/15 bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15";
  const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400";

  const selectedTier = tiers.find((t) => t.id === form.tierId);
  const activeCount = products.filter((p) => p.enabled).length;

  const visible = products.filter((p) => {
    if (filter === "bandel") return p.source === "bandel";
    if (filter === "gateway") return p.source === "gateway";
    if (filter === "manual") return p.source === "manual";
    if (filter === "aktif") return p.enabled;
    if (filter === "nonaktif") return !p.enabled;
    return true;
  });

  const kpis = [
    { icon: Package, label: "Total produk", value: nf.format(products.length) },
    { icon: Zap, label: "Aktif dijual", value: `${activeCount}/${products.length}` },
    { icon: Router, label: "Produk bandel", value: nf.format(products.filter((p) => p.source === "bandel").length) },
    {
      icon: Boxes,
      label: "Stok manual",
      value: `${nf.format(products.filter((p) => p.source === "manual").reduce((s, p) => s + (p.stock ?? 0), 0))} item`,
    },
  ];

  const filters: { id: typeof filter; label: string }[] = [
    { id: "all", label: "Semua" },
    { id: "aktif", label: "Aktif" },
    { id: "nonaktif", label: "Nonaktif" },
    { id: "bandel", label: "Bandel" },
    { id: "gateway", label: "Gateway" },
    { id: "manual", label: "Manual" },
  ];

  return (
    <div className="space-y-6">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((c) => (
          <li key={c.label} className="glass p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                {c.label}
              </span>
              <c.icon className="h-4 w-4 shrink-0 text-crimson-500" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{c.value}</p>
          </li>
        ))}
      </ul>

      <form onSubmit={create} className="glass space-y-5 p-5">
        <header className="flex items-center gap-2 text-crimson-500">
          <Sparkles className="h-4 w-4" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Tambah produk token</h2>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block xl:col-span-2">
            <span className={labelCls}>Nama produk</span>
            <input
              required
              maxLength={60}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Paket 5 Juta Token"
              className={field}
            />
          </label>

          <label className="block">
            <span className={labelCls}>Sumber stok</span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "bandel", label: "Bandel", icon: Router },
                  { id: "gateway", label: "Gateway", icon: Coins },
                  { id: "manual", label: "Manual", icon: Boxes },
                ] as const
              ).map((s) => {
                const active = form.source === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setForm({ ...form, source: s.id })}
                    aria-pressed={active}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                      active
                        ? "border-crimson-500 bg-crimson/10 text-crimson-500"
                        : "border-slate-900/15 text-slate-500 hover:border-crimson-500/50 dark:border-white/15 dark:text-slate-400"
                    }`}
                  >
                    <s.icon className="h-3.5 w-3.5" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </label>

          <label className="block">
            <span className={labelCls}>Harga (Rp)</span>
            <input
              required
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="15000"
              className={`${field} font-mono text-xs`}
            />
          </label>

          <label className="block">
            <span className={labelCls}>Badge promo (opsional)</span>
            <input
              maxLength={30}
              value={form.promoBadge}
              onChange={(e) => setForm({ ...form, promoBadge: e.target.value })}
              placeholder="PROMO / HEMAT 20%"
              className={field}
            />
          </label>
        </div>

        {form.source === "bandel" && (
          <div>
            <span className={labelCls}>
              Paket bandel
              {selectedTier && (
                <span className="ml-2 font-mono text-[10px] normal-case tracking-normal text-crimson-500">
                  {compact(selectedTier.tokens)} token · {selectedTier.validDays} hari
                </span>
              )}
            </span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-7">
              {tiers.map((t) => {
                const active = form.tierId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm({ ...form, tierId: t.id })}
                    aria-pressed={active}
                    className={`group rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? "border-crimson-500 bg-crimson/10"
                        : "border-slate-900/15 hover:border-crimson-500/50 dark:border-white/15"
                    }`}
                  >
                    <p className={`font-mono text-xs font-semibold ${active ? "text-crimson-500" : ""}`}>
                      {t.id.toUpperCase()}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{t.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {form.source === "gateway" && (
          <div className="space-y-3">
            <div>
              <span className={labelCls}>
                Jumlah token
                {form.gatewayPreset !== "custom" && (
                  <span className="ml-2 font-mono text-[10px] normal-case tracking-normal text-crimson-500">
                    {compact(Number(form.tokens))} token
                  </span>
                )}
              </span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-7">
                {tiers.map((t) => {
                  const active = form.gatewayPreset === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm({ ...form, gatewayPreset: t.id, tokens: String(t.tokens), validDays: String(t.validDays) })}
                      aria-pressed={active}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-crimson-500 bg-crimson/10"
                          : "border-slate-900/15 hover:border-crimson-500/50 dark:border-white/15"
                      }`}
                    >
                      <p className={`font-mono text-xs font-semibold ${active ? "text-crimson-500" : ""}`}>
                        {t.id.toUpperCase()}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{t.label}</p>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, gatewayPreset: "custom" })}
                  aria-pressed={form.gatewayPreset === "custom"}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    form.gatewayPreset === "custom"
                      ? "border-crimson-500 bg-crimson/10"
                      : "border-slate-900/15 hover:border-crimson-500/50 dark:border-white/15"
                  }`}
                >
                  <p
                    className={`font-mono text-xs font-semibold ${
                      form.gatewayPreset === "custom" ? "text-crimson-500" : ""
                    }`}
                  >
                    CUSTOM
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">isi sendiri</p>
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className={labelCls}>Token {form.gatewayPreset === "custom" ? "(isi manual)" : "(dari preset)"}</span>
                <input
                  required
                  type="number"
                  min={1_000_000}
                  step={1_000_000}
                  value={form.tokens}
                  readOnly={form.gatewayPreset !== "custom"}
                  onChange={(e) => setForm({ ...form, tokens: e.target.value })}
                  className={`${field} font-mono text-xs ${
                    form.gatewayPreset !== "custom" ? "cursor-not-allowed opacity-70" : ""
                  }`}
                />
              </label>
              <label className="block">
                <span className={labelCls}>
                  Masa aktif {form.gatewayPreset !== "custom" && "(ubah sesuai kebutuhan)"}
                </span>
                <input
                  required
                  type="number"
                  min={1}
                  max={365}
                  value={form.validDays}
                  onChange={(e) => setForm({ ...form, validDays: e.target.value })}
                  className={`${field} font-mono text-xs`}
                />
                <span className="mt-1.5 block text-[10px] text-slate-500 dark:text-slate-400">
                  1–365 hari, bebas (mis. 1, 2, 30).
                </span>
              </label>
              <label className="block">
                <span className={labelCls}>Stok tersedia</span>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.unlimited}
                      onChange={(e) => setForm({ ...form, unlimited: e.target.checked })}
                      className="h-3.5 w-3.5 accent-crimson"
                    />
                    Unlimited
                  </label>
                  {!form.unlimited && (
                    <input
                      required
                      type="number"
                      min={0}
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      placeholder="mis. 10"
                      className={`${field} font-mono text-xs`}
                    />
                  )}
                 </div>
               </label>
             </div>
           </div>
        )}

        {form.source === "manual" && (
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Kategori</span>
              <input
                required
                maxLength={40}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Akun Premium"
                className={field}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Code produk</span>
              <input
                required
                maxLength={20}
                value={form.productCode}
                onChange={(e) => setForm({ ...form, productCode: e.target.value.toUpperCase() })}
                placeholder="NETFLIX1M"
                spellCheck={false}
                className={`${field} font-mono text-xs`}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Harga (Rp)</span>
              <input
                required
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="15000"
                className={`${field} font-mono text-xs`}
              />
            </label>

            <label className="block lg:col-span-3">
              <span className={labelCls}>
                Stok awal — email:password per baris (1 baris = 1 stok
                {form.stockItems
                  ? ` · ${form.stockItems.split(/\r?\n/).filter((l) => l.trim() && l.includes(":")).length} item terdeteksi`
                  : ""}
                )
              </span>
              <textarea
                value={form.stockItems}
                onChange={(e) => setForm({ ...form, stockItems: e.target.value })}
                placeholder={"email1@gmail.com:password123\nemail2@gmail.com:password456"}
                rows={5}
                spellCheck={false}
                className={`${field} font-mono text-[11px]`}
              />
              <span className="mt-1.5 block text-[11px] text-slate-500 dark:text-slate-400">
                Boleh kosong dulu — stok bisa ditambah kapan saja lewat tombol "Stok" di katalog.
              </span>
            </label>
          </div>
        )}

        {createError && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs text-crimson-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {createError}
          </p>
        )}

        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite shadow-neon transition hover:bg-crimson-600 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {creating ? "Menyimpan…" : "Tambah produk"}
        </button>
      </form>

      {error && (
        <p role="alert" className="glass flex items-start gap-2 border-crimson/40 p-4 text-xs text-crimson-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <section className="glass p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-crimson-500">
            <Boxes className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Katalog produk</h2>
            <span className="rounded-full bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] normal-case tracking-normal text-slate-400">
              {visible.length} produk
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-900/15 p-0.5 dark:border-white/15">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  filter === f.id
                    ? "bg-crimson text-offwhite"
                    : "text-slate-500 hover:text-crimson-500 dark:text-slate-400"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {visible.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-medium">Belum ada produk di kategori ini</p>
            <p className="mt-1 text-xs text-slate-400">
              Tambahkan produk pertama di form atas — stok bandel pakai paket top up reseller, gateway dari API keys sendiri.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((p) => {
              const tier = tierTier(p.tokens);
              const style = tierStyle[tier];
              return (
                <li
                  key={p.id}
                  className={`group relative flex flex-col rounded-2xl border bg-white/70 p-5 backdrop-blur-xl transition dark:bg-white/[.03] ${style.ring} ${style.glow} ${
                    p.enabled ? "" : "opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">#{p.id}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${style.badge}`}>
                        {style.label}
                      </span>
                      {p.promoBadge && (
                        <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white shadow-sm">
                          {p.promoBadge}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    {p.source === "manual" ? (
                      <p className="font-display text-3xl font-semibold tracking-tight">
                        {p.stock ?? 0}
                        <span className="ml-1 text-sm font-medium text-slate-400">
                          stok{p.soldCount ? ` · ${p.soldCount} terjual` : ""}
                        </span>
                      </p>
                    ) : (
                      <p className="font-display text-3xl font-semibold tracking-tight">
                        {compact(p.tokens)}
                        <span className="ml-1 text-sm font-medium text-slate-400">token</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
                        p.source === "bandel"
                          ? "bg-sky-500/10 text-sky-400"
                          : p.source === "manual"
                            ? "bg-violet-500/10 text-violet-400"
                            : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {p.source === "bandel" ? (
                        <>
                          <Router className="h-3 w-3" /> bandel {p.tierId?.toUpperCase()}
                        </>
                      ) : p.source === "manual" ? (
                        <>
                          <Boxes className="h-3 w-3" /> {p.productCode}
                        </>
                      ) : (
                        <>
                          <Coins className="h-3 w-3" /> gateway
                          {p.stock !== null && p.stock !== undefined ? ` · ${p.stock}` : ""}
                        </>
                      )}
                    </span>
                    {p.source === "manual" ? (
                      p.category && (
                        <span className="rounded-full bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                          {p.category}
                        </span>
                      )
                    ) : (
                      <span className="rounded-full bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                        {p.validDays} hari
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-900/10 pt-4 dark:border-white/10">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">Harga</p>
                      <p className="font-display text-xl font-semibold text-crimson-500">{rupiah(p.price)}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {p.source === "manual" && (
                        <a
                          href={`/admin/produk/${p.id}/stok`}
                          className="inline-flex items-center gap-1 rounded-lg border border-crimson/30 bg-crimson/5 px-2.5 py-1.5 text-xs font-semibold text-crimson-500 transition hover:bg-crimson/10"
                        >
                          <Boxes className="h-3.5 w-3.5" />
                          Stok
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => toggle(p)}
                        disabled={busy === `toggle-${p.id}`}
                        aria-label={p.enabled ? "Nonaktifkan" : "Aktifkan"}
                        title={p.enabled ? "Nonaktifkan" : "Aktifkan"}
                        className={`grid h-8 w-8 place-items-center rounded-lg border transition disabled:opacity-50 ${
                          p.enabled
                            ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                            : "border-slate-900/15 text-slate-400 hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
                        }`}
                      >
                        {busy === `toggle-${p.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Power className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalError(null);
                          setEditName(p.name);
                          setEditPrice(String(p.price));
                          setEditPromo(p.promoBadge ?? "");
                          setEditStock(p.stock === null || p.stock === undefined ? "" : String(p.stock));
                          setEditTarget(p);
                        }}
                        aria-label="Ubah produk"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-900/15 transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalError(null);
                          setDelTarget(p);
                        }}
                        aria-label="Hapus produk"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-900/15 text-crimson-500 transition hover:border-crimson-500 dark:border-white/15"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <span
                    className={`absolute right-4 top-0 -translate-y-1/2 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase shadow-sm ${
                      p.enabled ? "bg-emerald-500 text-offwhite" : "bg-slate-400 text-offwhite"
                    }`}
                  >
                    {p.enabled ? "aktif" : "nonaktif"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>


      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={`Ubah ${editTarget?.name ?? ""}`}
        description="Ubah nama, harga, atau stok produk. Token & masa aktif mengikuti paket saat dibuat."
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-900/15 px-5 py-2.5 text-sm font-medium transition hover:border-crimson-500 dark:border-white/15"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={busy === "edit"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-50"
            >
              {busy === "edit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Simpan
            </button>
          </>
        }
      >
        {editTarget && (
          <div className="space-y-3">
            <label className="block">
              <span className={labelCls}>Nama</span>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={60} className={field} />
            </label>
            <label className="block">
              <span className={labelCls}>Harga (Rp)</span>
              <input
                type="number"
                min={0}
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className={`${field} font-mono text-xs`}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Badge promo (kosongkan = tanpa badge)</span>
              <input
                value={editPromo}
                onChange={(e) => setEditPromo(e.target.value)}
                maxLength={30}
                placeholder="PROMO / HEMAT 20%"
                className={field}
              />
            </label>
            {editTarget.source === "gateway" && (
              <label className="block">
                <span className={labelCls}>Stok (kosongkan = unlimited)</span>
                <input
                  type="number"
                  min={0}
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  className={`${field} font-mono text-xs`}
                />
              </label>
            )}
            {modalError && <p className="text-xs text-crimson-400">{modalError}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={delTarget !== null}
        onClose={() => setDelTarget(null)}
        title="Hapus produk"
        tone="danger"
        description="Produk akan dihapus dari daftar penjualan. Tindakan ini tidak dapat dibatalkan."
        footer={
          <>
            <button
              type="button"
              onClick={() => setDelTarget(null)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-900/15 px-5 py-2.5 text-sm font-medium transition hover:border-crimson-500 dark:border-white/15"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy === "del"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-50"
            >
              {busy === "del" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Ya, hapus
            </button>
          </>
        }
      >
        {delTarget && (
          <div className="rounded-xl bg-crimson/10 px-3 py-2.5 font-mono text-xs text-crimson-400">
            <p>{delTarget.name}</p>
            <p className="mt-1 opacity-80">
              {compact(delTarget.tokens)} token · {rupiah(delTarget.price)}
            </p>
          </div>
        )}
        {modalError && <p className="mt-2 text-xs text-crimson-400">{modalError}</p>}
      </Modal>
    </div>
  );
}

function tierTier(n: number): string {
  return tokenTier(n);
}
