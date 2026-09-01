"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Gauge,
  KeyRound,
  Loader2,
  QrCode,
  Receipt,
  RefreshCw,
  Save,
  Timer,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { PaymentSettings } from "@/lib/payment";

const rupiah = (n: number) => `Rp${new Intl.NumberFormat("id-ID").format(n)}`;
const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);
const clock = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

type OrderRow = {
  invoice: string;
  status: string;
  amount: number;
  productName: string;
  tokens: number;
  createdAt: string;
  paidAt?: string;
  delivered?: string;
};

const PROVIDERS = [
  { id: "none", label: "Nonaktif", desc: "Pembayaran dimatikan" },
  { id: "dana", label: "DANA", desc: "QRIS via DANA" },
  { id: "neobank", label: "NeoBank", desc: "QRIS via Nobu/Neobank" },
  { id: "gopay", label: "GoPay", desc: "QRIS via GoPay" },
] as const;

const STATUS_FILTERS = [
  { id: "all", label: "Semua" },
  { id: "paid", label: "Berhasil" },
  { id: "pending", label: "Menunggu" },
  { id: "expired", label: "Kedaluwarsa" },
  { id: "failed", label: "Gagal" },
] as const;

const statusTone = (s: string) =>
  s === "paid"
    ? "bg-emerald-500/10 text-emerald-400"
    : s === "pending"
      ? "bg-amber-500/10 text-amber-500"
      : s === "failed"
        ? "bg-crimson/10 text-crimson-400"
        : "bg-slate-500/10 text-slate-400";

function genSecret(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function CopyBtn({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-xs font-medium transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Tersalin" : label}
    </button>
  );
}

export default function PaymentSettingsForm({
  initialSettings,
  initialData,
  callbackUrl,
}: {
  initialSettings: PaymentSettings;
  initialData: {
    orders: OrderRow[];
    total: number;
    page: number;
    totalPages: number;
    counts: Record<string, number>;
  };
  callbackUrl: string;
}) {
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [settings, setSettings] = useState({
    qrisProvider: initialSettings.qrisProvider,
    qrisStatic: initialSettings.qrisStatic,
    uniqueCodeEnabled: initialSettings.uniqueCodeEnabled,
    ttlMinutes: String(initialSettings.ttlMinutes),
    forwarderSecret: initialSettings.forwarderSecret,
    maxPendingOrders: String(initialSettings.maxPendingOrders),
  });
  const [showSecret, setShowSecret] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const [orders, setOrders] = useState(initialData.orders);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(initialData.page);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [counts, setCounts] = useState(initialData.counts);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loadingPage, setLoadingPage] = useState(false);

  const loadOrders = useCallback(async (p: number, status: string) => {
    setLoadingPage(true);
    try {
      const res = await fetch(`/api/admin/payment?page=${p}&limit=5&status=${status}`, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return;
      const body = await res.json().catch(() => null);
      if (body?.orders) {
        setOrders(body.orders);
        setTotal(body.total);
        setPage(body.page);
        setTotalPages(body.totalPages);
        setCounts(body.counts);
      }
    } finally {
      setLoadingPage(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(1, statusFilter);
  }, [statusFilter, loadOrders]);

  const dirty =
    settings.qrisProvider !== initialSettings.qrisProvider ||
    settings.qrisStatic !== initialSettings.qrisStatic ||
    settings.uniqueCodeEnabled !== initialSettings.uniqueCodeEnabled ||
    Number(settings.ttlMinutes) !== initialSettings.ttlMinutes ||
    settings.forwarderSecret !== initialSettings.forwarderSecret ||
    Number(settings.maxPendingOrders) !== initialSettings.maxPendingOrders;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrisProvider: settings.qrisProvider,
          qrisStatic: settings.qrisStatic.trim(),
          uniqueCodeEnabled: settings.uniqueCodeEnabled,
          ttlMinutes: Number(settings.ttlMinutes),
          forwarderSecret: settings.forwarderSecret.trim(),
          maxPendingOrders: Number(settings.maxPendingOrders),
        }),
      }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Gagal (HTTP ${res.status}).`);
      setState("saved");
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan pengaturan.");
      setState("idle");
    }
  };

  const field =
    "w-full rounded-xl border border-slate-900/15 bg-transparent px-3.5 py-2.5 text-sm outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15";
  const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400";

  const revenue = orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.amount, 0);
  const kpis = [
    { icon: Wallet, label: "Gateway", value: settings.qrisProvider === "none" ? "Nonaktif" : PROVIDERS.find((p) => p.id === settings.qrisProvider)?.label ?? "—" },
    { icon: Receipt, label: "Total transaksi", value: String(counts.all ?? 0) },
    { icon: Check, label: "Terbayar", value: String(counts.paid ?? 0) },
    { icon: QrCode, label: "Pendapatan (hal. ini)", value: rupiah(revenue) },
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
            <p className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-2xl">{c.value}</p>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="glass p-5">
        <button
          type="button"
          onClick={() => setGatewayOpen((o) => !o)}
          aria-expanded={gatewayOpen}
          aria-controls="payment-gateway-body"
          className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2 text-crimson-500">
            <CreditCard className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Payment Gateway</h2>
            <span
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase ${
                settings.qrisProvider === "none" ? "bg-slate-500/10 text-slate-400" : "bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {settings.qrisProvider === "none" ? "offline" : "online"}
            </span>
          </span>
          <span className="flex items-center gap-2">
            {(state === "saved" || dirty) && (
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">
                {state === "saved" ? "tersimpan" : "ada perubahan"}
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${gatewayOpen ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        <div
          id="payment-gateway-body"
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            gatewayOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="mt-5 space-y-6">
              <div>
                <span className={labelCls}>Gateway aktif (sumber QRIS)</span>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {PROVIDERS.map((p) => {
                    const active = settings.qrisProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, qrisProvider: p.id })}
                        aria-pressed={active}
                        className={`rounded-xl border px-3.5 py-3 text-left transition ${
                          active
                            ? "border-crimson-500 bg-crimson/10"
                            : "border-slate-900/15 hover:border-crimson-500/50 dark:border-white/15"
                        }`}
                      >
                        <p className={`text-xs font-semibold ${active ? "text-crimson-500" : ""}`}>{p.label}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <span className={labelCls}>QRIS statis (tempel string dari aplikasi merchant)</span>
                <textarea
                  value={settings.qrisStatic}
                  onChange={(e) => setSettings({ ...settings, qrisStatic: e.target.value })}
                  placeholder="00020101021126..."
                  rows={3}
                  spellCheck={false}
                  className={`${field} font-mono text-[11px]`}
                />
                <span className="mt-1.5 block text-[11px] text-slate-500 dark:text-slate-400">
                  Divalidasi CRC otomatis. Nominal dinamis + kode unik ditambahkan server saat member membuat pesanan.
                </span>
              </label>

              <div className="grid gap-4 lg:grid-cols-3">
                <label className="block">
                  <span className={labelCls}>
                    <Timer className="mr-1 inline h-3 w-3" /> Expired (menit)
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={60}
                      value={Math.min(60, Number(settings.ttlMinutes) || 10)}
                      onChange={(e) => setSettings({ ...settings, ttlMinutes: e.target.value })}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-900/10 accent-crimson dark:bg-white/10"
                    />
                    <span className="w-16 shrink-0 rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-center font-mono text-xs dark:border-white/15">
                      {Number(settings.ttlMinutes) || 0} mnt
                    </span>
                  </div>
                  <span className="mt-1.5 block text-[11px] text-slate-500 dark:text-slate-400">1–120 menit.</span>
                </label>

                <div>
                  <span className={labelCls}>Kode unik 3 digit</span>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, uniqueCodeEnabled: !settings.uniqueCodeEnabled })}
                    aria-pressed={settings.uniqueCodeEnabled}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                      settings.uniqueCodeEnabled
                        ? "border-crimson-500 bg-crimson/10"
                        : "border-slate-900/15 dark:border-white/15"
                    }`}
                  >
                    <span className="text-left">
                      <span className={`block text-xs font-semibold ${settings.uniqueCodeEnabled ? "text-crimson-500" : ""}`}>
                        {settings.uniqueCodeEnabled ? "Aktif" : "Nonaktif"}
                      </span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                        {settings.uniqueCodeEnabled ? "nominal +100–999" : "nominal pas"}
                      </span>
                    </span>
                    <span
                      className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                        settings.uniqueCodeEnabled ? "bg-crimson" : "bg-slate-900/20 dark:bg-white/20"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-offwhite shadow transition-all ${
                          settings.uniqueCodeEnabled ? "left-[1.15rem]" : "left-0.5"
                        }`}
                      />
                    </span>
                  </button>
                </div>

                <div>
                  <span className={labelCls}>
                    <Gauge className="mr-1 inline h-3 w-3" /> Rate limit pending
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={Number(settings.maxPendingOrders) || 3}
                      onChange={(e) => setSettings({ ...settings, maxPendingOrders: e.target.value })}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-900/10 accent-crimson dark:bg-white/10"
                    />
                    <span className="w-16 shrink-0 rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-center font-mono text-xs dark:border-white/15">
                      {Number(settings.maxPendingOrders) || 3}x
                    </span>
                  </div>
                  <span className="mt-1.5 block text-[11px] text-slate-500 dark:text-slate-400">
                    Maks pesanan pending per member (1–10).
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-900/10 p-4 dark:border-white/10">
                <span className={labelCls}>
                  <KeyRound className="mr-1 inline h-3 w-3" /> Secret callback forwarder
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={settings.forwarderSecret}
                      onChange={(e) => setSettings({ ...settings, forwarderSecret: e.target.value })}
                      placeholder="klik Generate untuk membuat otomatis"
                      spellCheck={false}
                      autoComplete="off"
                      className={`${field} pr-11 font-mono text-xs`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((s) => !s)}
                      aria-label={showSecret ? "Sembunyikan secret" : "Tampilkan secret"}
                      className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 transition hover:text-crimson-500"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSettings({ ...settings, forwarderSecret: genSecret() });
                      setShowSecret(true);
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-crimson/30 bg-crimson/5 px-3.5 py-2.5 text-xs font-semibold text-crimson-500 transition hover:bg-crimson/10"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Generate
                  </button>
                  {settings.forwarderSecret && <CopyBtn value={settings.forwarderSecret} label="Salin" />}
                </div>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Dipakai aplikasi Android forwarder (DANA/NeoBank/GoPay) — kirim sebagai header{" "}
                  <code className="font-mono">x-forward-secret</code> atau field <code className="font-mono">secret</code>.
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl bg-slate-900/[.04] px-3.5 py-2.5 dark:bg-white/[.04]">
                  <code className="min-w-0 flex-1 break-all font-mono text-[11px]">{callbackUrl}</code>
                  <CopyBtn value={callbackUrl} label="Salin URL" />
                </div>
              </div>

              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs text-crimson-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={state === "saving" || state === "saved" || !dirty}
                className="inline-flex items-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite shadow-neon transition hover:bg-crimson-600 disabled:opacity-50"
              >
                {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {state === "saving" ? "Menyimpan…" : state === "saved" ? "Tersimpan" : "Simpan pengaturan"}
              </button>
            </div>
          </div>
        </div>
      </form>

      <section className="glass p-5">
        <button
          type="button"
          onClick={() => setTxOpen((o) => !o)}
          aria-expanded={txOpen}
          aria-controls="payment-transactions-body"
          className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2 text-crimson-500">
            <Receipt className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Transaksi</h2>
            <span className="rounded-full bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] normal-case tracking-normal text-slate-400">
              {counts.all ?? 0} total · {counts.paid ?? 0} terbayar
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 sm:inline">
              {txOpen ? "tutup" : "lihat"}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${txOpen ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        <div
          id="payment-transactions-body"
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            txOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="mt-4">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-900/15 p-0.5 dark:border-white/15">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      aria-pressed={statusFilter === f.id}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        statusFilter === f.id
                          ? "bg-crimson text-offwhite"
                          : "text-slate-500 hover:text-crimson-500 dark:text-slate-400"
                      }`}
                    >
                      {f.label}
                      <span className="ml-1 font-mono text-[9px] opacity-70">{counts[f.id] ?? 0}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => loadOrders(page, statusFilter)}
                  disabled={loadingPage}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-xs font-medium transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-50 dark:border-white/15"
                >
                  {loadingPage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Refresh
                </button>
              </div>

              {orders.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">Belum ada transaksi.</p>
              ) : (
                <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-900/10 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 dark:border-white/10">
                        <th className="py-2.5 pr-3 font-semibold">Invoice</th>
                        <th className="py-2.5 pr-3 font-semibold">Produk</th>
                        <th className="py-2.5 pr-3 text-right font-semibold">Nominal</th>
                        <th className="py-2.5 pr-3 font-semibold">Status</th>
                        <th className="py-2.5 pr-3 font-semibold">Dibayar</th>
                        <th className="py-2.5 font-semibold">Pengiriman</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/10 dark:divide-white/10">
                      {orders.map((o) => (
                        <tr key={o.invoice} className="transition hover:bg-crimson/[.03]">
                          <td className="py-3 pr-3">
                            <p className="font-mono text-xs">{o.invoice}</p>
                            <p className="font-mono text-[10px] text-slate-400">{clock(o.createdAt)}</p>
                          </td>
                          <td className="py-3 pr-3">
                            <p className="max-w-[12rem] truncate text-xs font-medium">{o.productName}</p>
                            <p className="font-mono text-[10px] text-slate-400">{compact(o.tokens)} token</p>
                          </td>
                          <td className="py-3 pr-3 text-right font-mono text-xs">{rupiah(o.amount)}</td>
                          <td className="py-3 pr-3">
                            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${statusTone(o.status)}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 pr-3 font-mono text-[10px] text-slate-400">{clock(o.paidAt)}</td>
                          <td className="py-3">
                            {o.delivered ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                                <Check className="h-3 w-3" /> terkirim
                              </span>
                            ) : o.status === "paid" ? (
                              <span className="text-[10px] text-amber-500">belum</span>
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400">
                    {total} transaksi · hal. {page} / {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadOrders(page - 1, statusFilter)}
                      disabled={page <= 1 || loadingPage}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-900/15 transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-40 dark:border-white/15"
                      aria-label="Halaman sebelumnya"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => loadOrders(page + 1, statusFilter)}
                      disabled={page >= totalPages || loadingPage}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-900/15 transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-40 dark:border-white/15"
                      aria-label="Halaman berikutnya"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
