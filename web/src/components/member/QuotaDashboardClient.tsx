"use client";

import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  Gauge,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  LogIn,
  MessageSquare,
  RefreshCw,
  Terminal,
  Unlock,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { SiteName } from "@/components/SiteName";

type Meta = { id: string | number; name?: string; status?: string; pinSet?: boolean; pinLockedUntil?: string | null };
type ModelRow = { id: string; enabled: boolean; vision: boolean; description?: string; multiplier: number; grade: string };
type QuotaData = {
  id: string | number;
  name: string;
  status: string;
  key: string;
  keyMasked: string;
  maxTokens: number;
  validDays: number | null;
  expiresAt: string | null;
  baseUrl: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cachedTokens: number; requests: number };
  usageByModel: Record<string, { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; requests?: number }>;
  models: ModelRow[];
  resellerPhone?: string | null;
};

const nf = new Intl.NumberFormat("id-ID");
const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);

const clock = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const statusTone = (s?: string) =>
  s === "active"
    ? "bg-emerald-500/10 text-emerald-400"
    : s === "exceeded"
      ? "bg-crimson/10 text-crimson-400"
      : "bg-amber-500/10 text-amber-500";

const gradeTone = (g: string) =>
  g === "A"
    ? "bg-emerald-500/10 text-emerald-400"
    : g === "B"
      ? "bg-amber-500/10 text-amber-500"
      : g === "C"
        ? "bg-crimson/10 text-crimson-400"
        : "bg-slate-500/10 text-slate-400";

const label = "text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400";

function CopyBtn({ value, label: text }: { value: string; label: string }) {
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
      {done ? "Tersalin" : text}
    </button>
  );
}

function KpiCard({ label: l, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <li className="glass p-5">
      <p className={label}>{l}</p>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 font-mono text-[10px] text-slate-400">{hint}</p>}
    </li>
  );
}

export default function QuotaDashboardClient({ token, siteName }: { token: string; siteName: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [data, setData] = useState<QuotaData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [tab, setTab] = useState<"kuota" | "model" | "usage" | "tutorial">("kuota");
  const [modelSearch, setModelSearch] = useState("");
  const [modelFilter, setModelFilter] = useState<"all" | "aktif" | "oos">("all");
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");

  const storageKey = `quota_at_${token}`;

  const loadData = useCallback(
    async (at?: string) => {
      const accessToken = at ?? sessionStorage.getItem(storageKey);
      if (!accessToken) return;
      setBusy(true);
      setDataError(null);
      try {
        const res = await fetch(`/api/member/quota/${token}?action=data`, {
          headers: { "x-access-token": accessToken },
          cache: "no-store",
        }).catch(() => null);
        if (!res) throw new Error("Tidak dapat menghubungi server.");
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) {
            sessionStorage.removeItem(storageKey);
            setUnlocked(false);
          }
          throw new Error(body?.error ?? `Gagal (HTTP ${res.status}).`);
        }
        setData(body as QuotaData);
      } catch (e) {
        setDataError(e instanceof Error ? e.message : "Gagal memuat data.");
      } finally {
        setBusy(false);
      }
    },
    [storageKey, token]
  );

  useEffect(() => {
    setOrigin(window.location.origin);
    (async () => {
      const res = await fetch(`/api/member/quota/${token}`, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) {
        const body = await res?.json().catch(() => ({}));
        setMetaError(body?.error ?? "Dashboard tidak ditemukan.");
        return;
      }
      setMeta((await res.json()) as Meta);
    })();
    const at = sessionStorage.getItem(storageKey);
    if (at) {
      setUnlocked(true);
      loadData(at);
    }
  }, [token, storageKey, loadData]);

  useEffect(() => {
    if (unlocked && !data) loadData();
  }, [unlocked, data, loadData]);

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setPinError("PIN harus 6 digit.");
      return;
    }
    setPinBusy(true);
    setPinError(null);
    try {
      const res = await fetch(`/api/member/quota/${token}?action=verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "PIN salah.");
      sessionStorage.setItem(storageKey, body.accessToken);
      setUnlocked(true);
      setPin("");
      loadData(body.accessToken);
    } catch (e) {
      setPinError(e instanceof Error ? e.message : "Gagal verifikasi PIN.");
    } finally {
      setPinBusy(false);
    }
  };

  const lock = () => {
    sessionStorage.removeItem(storageKey);
    setUnlocked(false);
    setData(null);
    setShowKey(false);
  };

  const pct = data && data.maxTokens > 0 ? (data.usage.total_tokens / data.maxTokens) * 100 : 0;
  const remaining = data ? Math.max(0, data.maxTokens - data.usage.total_tokens) : 0;
  const selfOrigin = origin || (typeof window !== "undefined" ? window.location.origin : "");
  const baseUrl = data?.baseUrl && data.baseUrl.includes("bandelbanget") ? `${selfOrigin}/v1` : data?.baseUrl || `${selfOrigin}/v1`;
  const exampleKey = showKey && data ? data.key : "sk-...";
  const allModels = data?.models ?? [];
  const filteredModels = allModels
    .filter((m) => !modelSearch || m.id.toLowerCase().includes(modelSearch.toLowerCase()))
    .filter((m) =>
      modelFilter === "aktif" ? m.enabled : modelFilter === "oos" ? !m.enabled : true
    );
  const activeCount = allModels.filter((m) => m.enabled).length;
  const oosCount = allModels.length - activeCount;
  const usageRows = Object.entries(data?.usageByModel ?? {}).sort((a, b) => (b[1].total_tokens ?? 0) - (a[1].total_tokens ?? 0));

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-slate-900/10 bg-offwhite/80 backdrop-blur-xl dark:border-white/10 dark:bg-slateDeep-900/80">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex shrink-0 items-center gap-2 font-display font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-crimson/10 text-crimson-500">
              <Cpu className="h-4 w-4" />
            </span>
            <SiteName name={siteName} className="hidden sm:inline" />
          </a>
          <span className="rounded-full border border-crimson/30 bg-crimson/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-crimson-500">
            member
          </span>

          {meta && (
            <span className={`ml-2 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase ${statusTone(meta.status)}`}>
              {meta.status ?? "—"}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {data && (
              <span className="hidden max-w-[14rem] truncate text-xs text-slate-500 md:inline dark:text-slate-400">
                {data.name} · #{data.id}
              </span>
            )}
            <a
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/10 bg-white/60 px-3 py-2.5 text-xs font-medium transition hover:border-crimson-600 dark:border-white/10 dark:bg-white/5"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kontak</span>
            </a>
            {unlocked && (
              <button
                type="button"
                onClick={lock}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/10 bg-white/60 px-3 py-2.5 text-xs font-medium transition hover:border-crimson-600 dark:border-white/10 dark:bg-white/5"
              >
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Kunci</span>
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {unlocked && (
          <div className="border-t border-slate-900/10 dark:border-white/10">
            <ul className="flex items-center gap-0.5 overflow-x-auto px-4 sm:px-6 lg:px-8">
              {[
                { id: "kuota" as const, label: "Kuota", icon: Gauge },
                { id: "model" as const, label: "Model", icon: Boxes },
                { id: "usage" as const, label: "Usage", icon: BarChart3 },
                { id: "tutorial" as const, label: "Tutorial", icon: BookOpen },
              ].map((t) => {
                const active = tab === t.id;
                return (
                  <li key={t.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setTab(t.id)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm transition ${
                        active
                          ? "border-crimson font-medium text-crimson-500"
                          : "border-transparent text-slate-600 hover:text-crimson-500 dark:text-slate-300"
                      }`}
                    >
                      <t.icon className="h-4 w-4" />
                      {t.label}
                    </button>
                  </li>
                );
              })}
              <li className="ml-auto shrink-0">
                <button
                  type="button"
                  onClick={() => loadData()}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 transition hover:text-crimson-500 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Refresh
                </button>
              </li>
            </ul>
          </div>
        )}
      </header>

      <main className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {metaError ? (
          <div className="glass mx-auto max-w-md p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-crimson-500" />
            <h1 className="mt-3 font-display text-lg font-semibold">Dashboard tidak ditemukan</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{metaError}</p>
          </div>
        ) : !unlocked ? (
          <section className="glass mx-auto max-w-md p-6 sm:p-8">
            <div className="text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-crimson/10">
                <Unlock className="h-6 w-6 text-crimson-500" />
              </span>
              <h1 className="mt-4 font-display text-xl font-semibold tracking-tight">
                {meta?.name ? `Halo, ${meta.name}` : "Buka kunci dashboard"}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Masukkan PIN 6 digit untuk melihat kuota &amp; API key kamu.
              </p>
            </div>

            <form onSubmit={submitPin} className="mt-6 space-y-4">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className="w-full rounded-xl border border-slate-900/15 bg-transparent px-4 py-3 text-center font-mono text-lg tracking-[0.4em] outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15"
                autoFocus
              />
              {pinError && (
                <p role="alert" className="flex items-center justify-center gap-2 text-xs text-crimson-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {pinError}
                </p>
              )}
              <button
                type="submit"
                disabled={pinBusy || pin.length !== 6}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-crimson px-5 py-3 text-sm font-semibold text-offwhite shadow-neon transition hover:bg-crimson-600 disabled:opacity-50"
              >
                {pinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {pinBusy ? "Memverifikasi" : "Masuk"}
              </button>
            </form>
          </section>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  {data ? `Halo, ${data.name}` : "Memuat…"}
                </h1>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                  {data ? (
                    <>
                      Member #{data.id} · kuota &amp; pemakaian akun kamu
                      {data.validDays != null && <> · masa aktif {data.validDays} hari</>}
                    </>
                  ) : (
                    "Mengambil data akun…"
                  )}
                </p>
              </div>
              {data?.expiresAt && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-crimson-500" />
                  berakhir {clock(data.expiresAt)}
                </span>
              )}
            </div>

            {dataError && (
              <p role="alert" className="glass flex items-start gap-2 border-crimson/40 p-4 text-xs text-crimson-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {dataError}
                <button type="button" onClick={() => loadData()} className="ml-auto shrink-0 font-medium underline">
                  coba lagi
                </button>
              </p>
            )}

            {data && (
              <>
                {tab === "kuota" && (
                  <div className="space-y-6">
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <KpiCard label="Sisa kuota" value={compact(remaining)} hint={nf.format(remaining)} />
                      <KpiCard label="Terpakai" value={compact(data.usage.total_tokens)} hint={nf.format(data.usage.total_tokens)} />
                      <KpiCard label="Maksimal" value={compact(data.maxTokens)} hint={nf.format(data.maxTokens)} />
                      <KpiCard label="Request" value={compact(data.usage.requests)} hint={nf.format(data.usage.requests)} />
                    </ul>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <section className="glass p-5 lg:col-span-2">
                        <header className="flex items-center gap-2 text-crimson-500">
                          <Gauge className="h-4 w-4" />
                          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Pemakaian kuota</h2>
                        </header>
                        <div className="mt-5">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                            <span className="text-slate-500 dark:text-slate-400">
                              terpakai <span className="text-crimson-500">{compact(data.usage.total_tokens)}</span> dari{" "}
                              {compact(data.maxTokens)} token
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              sisa <span className="text-emerald-400">{compact(remaining)}</span>
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-crimson to-crimson-600 transition-[width] duration-700"
                              style={{ width: `${Math.min(100, Math.max(0.5, pct))}%` }}
                            />
                          </div>
                          <div className="mt-2 font-mono text-[10px] text-slate-400">{pct.toFixed(2)}% terpakai</div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-900/10 pt-5 sm:grid-cols-4 dark:border-white/10">
                          {[
                            { l: "Prompt", v: compact(data.usage.prompt_tokens) },
                            { l: "Completion", v: compact(data.usage.completion_tokens) },
                            { l: "Cached", v: compact(data.usage.cachedTokens) },
                            { l: "Request", v: compact(data.usage.requests) },
                          ].map((s) => (
                            <div key={s.l}>
                              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">{s.l}</p>
                              <p className="mt-1 font-mono text-sm font-semibold">{s.v}</p>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="glass p-5">
                        <header className="flex items-center gap-2 text-crimson-500">
                          <Clock className="h-4 w-4" />
                          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Masa aktif</h2>
                        </header>
                        <div className="mt-5 space-y-3">
                          {[
                            { l: "Berakhir", v: clock(data.expiresAt) },
                            { l: "Durasi", v: data.validDays != null ? `${data.validDays} hari` : "—" },
                            { l: "Status", v: data.status },
                          ].map((s) => (
                            <div key={s.l} className="flex items-center justify-between gap-2 rounded-xl bg-slate-900/[.04] px-3.5 py-2.5 dark:bg-white/[.04]">
                              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">{s.l}</span>
                              <span className="text-xs font-semibold">{s.v}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <section className="glass p-5">
                        <header className="flex items-center gap-2 text-crimson-500">
                          <KeyRound className="h-4 w-4" />
                          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">API key</h2>
                        </header>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <code className="min-w-0 flex-1 break-all rounded-xl bg-slate-900/[.04] px-3.5 py-2.5 font-mono text-xs dark:bg-white/[.04]">
                            {showKey ? data.key : data.keyMasked}
                          </code>
                          <button
                            type="button"
                            onClick={() => setShowKey((s) => !s)}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-900/15 transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
                            aria-label={showKey ? "Sembunyikan key" : "Tampilkan key"}
                          >
                            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <CopyBtn value={data.key} label="Salin" />
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                          Jangan bagikan key ini — pemakaian dibebankan ke kuotamu.
                        </p>
                      </section>

                      <section className="glass p-5">
                        <header className="flex items-center gap-2 text-crimson-500">
                          <Link2 className="h-4 w-4" />
                          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Base URL</h2>
                        </header>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <code className="min-w-0 flex-1 break-all rounded-xl bg-slate-900/[.04] px-3.5 py-2.5 font-mono text-xs dark:bg-white/[.04]">
                            {baseUrl}
                          </code>
                          <CopyBtn value={baseUrl} label="Salin" />
                        </div>
                        <p className="mt-2 font-mono text-[10px] text-slate-400">
                          endpoint: {baseUrl}/models · {baseUrl}/chat/completions
                        </p>
                      </section>
                    </div>

                    <section className="glass p-5">
                      <header className="flex items-center gap-2 text-crimson-500">
                        <Terminal className="h-4 w-4" />
                        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Contoh pemakaian</h2>
                      </header>
                      <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900/[.04] p-4 font-mono text-[11px] leading-relaxed dark:bg-white/[.04]">
{`curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer ${exampleKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"auto","messages":[{"role":"user","content":"halo"}]}'`}
                      </pre>
                    </section>
                  </div>
                )}

                {tab === "model" && (
                  <section className="glass p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder="Cari model…"
                        className="w-full rounded-lg border border-slate-900/15 bg-transparent px-3.5 py-2 text-xs outline-none transition focus:border-crimson-500 dark:border-white/15"
                      />
                      <div className="flex items-center gap-1 rounded-lg border border-slate-900/15 p-0.5 dark:border-white/15">
                        {[
                          { id: "all" as const, label: "Semua" },
                          { id: "aktif" as const, label: "Aktif" },
                          { id: "oos" as const, label: "Out of stock" },
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setModelFilter(f.id)}
                            aria-pressed={modelFilter === f.id}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                              modelFilter === f.id
                                ? "bg-crimson text-offwhite"
                                : "text-slate-500 hover:text-crimson-500 dark:text-slate-400"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                      <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">
                        {activeCount} aktif · {oosCount} oos
                      </span>
                    </div>
                    <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredModels.length === 0 && (
                        <li className="col-span-full py-8 text-center text-xs text-slate-400">Tidak ada model cocok.</li>
                      )}
                      {filteredModels.map((m) => (
                        <li
                          key={m.id}
                          className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
                            m.enabled ? "border-slate-900/10 dark:border-white/10" : "border-slate-900/10 opacity-50 dark:border-white/10"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-xs font-semibold">{m.id}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-slate-400">×{m.multiplier} per token</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5">
                              {m.vision && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] text-sky-400">
                                  <Eye className="h-3 w-3" /> vision
                                </span>
                              )}
                              <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${gradeTone(m.grade)}`}>
                                {m.grade || "—"}
                              </span>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 font-mono text-[10px] ${
                                m.enabled ? "text-emerald-400" : "text-crimson-400"
                              }`}
                            >
                              {m.enabled ? (
                                <>
                                  <Check className="h-3 w-3" /> tersedia
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3" /> out of stock
                                </>
                              )}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {tab === "usage" && (
                  <div className="space-y-6">
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <KpiCard label="Total token" value={compact(data.usage.total_tokens)} hint={nf.format(data.usage.total_tokens)} />
                      <KpiCard label="Prompt" value={compact(data.usage.prompt_tokens)} hint={nf.format(data.usage.prompt_tokens)} />
                      <KpiCard label="Completion" value={compact(data.usage.completion_tokens)} hint={nf.format(data.usage.completion_tokens)} />
                      <KpiCard label="Total request" value={compact(data.usage.requests)} hint={nf.format(data.usage.requests)} />
                    </ul>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <section className="glass p-5 lg:col-span-2">
                        <header className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-crimson-500">
                            <BarChart3 className="h-4 w-4" />
                            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Token per model</h2>
                          </div>
                          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">
                            {usageRows.length} model dipakai
                          </span>
                        </header>

                        {usageRows.length === 0 ? (
                          <p className="py-12 text-center text-xs text-slate-400">Belum ada pemakaian.</p>
                        ) : (
                          <ul className="mt-5 space-y-3.5">
                            {usageRows.map(([model, u]) => {
                              const total = u.total_tokens ?? 0;
                              const share = data.usage.total_tokens > 0 ? (total / data.usage.total_tokens) * 100 : 0;
                              return (
                                <li key={model}>
                                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                    <span className="min-w-0 truncate font-mono text-xs font-semibold">{model}</span>
                                    <span className="shrink-0 font-mono text-[10px] text-slate-400">
                                      {compact(total)} token · {share.toFixed(1)}% · {nf.format(u.requests ?? 0)} req
                                    </span>
                                  </div>
                                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-crimson to-crimson-600 transition-[width] duration-700"
                                      style={{ width: `${Math.min(100, Math.max(1, share))}%` }}
                                    />
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </section>

                      <section className="glass p-5">
                        <header className="flex items-center gap-2 text-crimson-500">
                          <Terminal className="h-4 w-4" />
                          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Komposisi</h2>
                        </header>
                        <div className="mt-5 space-y-3">
                          {(() => {
                            const t = data.usage.total_tokens || 1;
                            const rows = [
                              { l: "Prompt", v: data.usage.prompt_tokens, tone: "from-crimson to-crimson-600" },
                              { l: "Completion", v: data.usage.completion_tokens, tone: "from-sky-500 to-sky-600" },
                              { l: "Cached", v: data.usage.cachedTokens, tone: "from-emerald-500 to-emerald-600" },
                            ];
                            return rows.map((r) => {
                              const share = (r.v / t) * 100;
                              return (
                                <div key={r.l}>
                                  <div className="flex items-baseline justify-between gap-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">{r.l}</span>
                                    <span className="font-mono text-[10px] text-slate-500 dark:text-slate-300">
                                      {compact(r.v)} · {share.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                                    <div
                                      className={`h-full rounded-full bg-gradient-to-r ${r.tone}`}
                                      style={{ width: `${Math.min(100, Math.max(1, share))}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>

                        <div className="mt-6 space-y-2 border-t border-slate-900/10 pt-4 dark:border-white/10">
                          {[
                            { l: "Rata-rata / request", v: data.usage.requests > 0 ? compact(Math.round(data.usage.total_tokens / data.usage.requests)) : "—" },
                            { l: "Model aktif dipakai", v: String(usageRows.length) },
                            { l: "Cache hit rate", v: data.usage.prompt_tokens > 0 ? `${((data.usage.cachedTokens / data.usage.prompt_tokens) * 100).toFixed(1)}%` : "—" },
                          ].map((s) => (
                            <div key={s.l} className="flex items-center justify-between gap-2 rounded-xl bg-slate-900/[.04] px-3.5 py-2.5 dark:bg-white/[.04]">
                              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">{s.l}</span>
                              <span className="font-mono text-xs font-semibold">{s.v}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    <section className="glass overflow-hidden">
                      <header className="flex items-center gap-2 border-b border-slate-900/10 px-5 py-4 text-crimson-500 dark:border-white/10">
                        <BarChart3 className="h-4 w-4" />
                        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Rincian per model</h2>
                      </header>
                      {usageRows.length === 0 ? (
                        <p className="py-12 text-center text-xs text-slate-400">Belum ada pemakaian.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[560px] text-left text-sm">
                            <thead>
                              <tr className="border-b border-slate-900/10 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 dark:border-white/10">
                                <th className="px-5 py-2.5 font-semibold">Model</th>
                                <th className="px-5 py-2.5 text-right font-semibold">Total token</th>
                                <th className="px-5 py-2.5 text-right font-semibold">Prompt</th>
                                <th className="px-5 py-2.5 text-right font-semibold">Completion</th>
                                <th className="px-5 py-2.5 text-right font-semibold">Request</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900/10 dark:divide-white/10">
                              {usageRows.map(([model, u]) => (
                                <tr key={model} className="transition hover:bg-crimson/[.03]">
                                  <td className="px-5 py-3 font-mono text-xs font-semibold">{model}</td>
                                  <td className="px-5 py-3 text-right font-mono text-xs">{compact(u.total_tokens ?? 0)}</td>
                                  <td className="px-5 py-3 text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                                    {compact(u.prompt_tokens ?? 0)}
                                  </td>
                                  <td className="px-5 py-3 text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                                    {compact(u.completion_tokens ?? 0)}
                                  </td>
                                  <td className="px-5 py-3 text-right font-mono text-xs">{nf.format(u.requests ?? 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  </div>
                )}
                {tab === "tutorial" && <Tutorial baseUrl={baseUrl} apiKey={showKey && data ? data.key : "sk-..."} />}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-crimson/10 font-mono text-[11px] font-semibold text-crimson-500">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">{title}</p>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{children}</div>
      </div>
    </li>
  );
}

function VideoEmbed({ src, title }: { src: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-900/10 dark:border-white/10">
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

function TutCard({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="glass p-5">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left">
        <h3 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-crimson-500">{title}</h3>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

function CodeBlock({ code, label = "Salin", lang }: { code: string; label?: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      {lang && (
        <span className="absolute right-2.5 top-2 rounded-md bg-slate-900/[.06] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400 dark:bg-white/[.06]">
          {lang}
        </span>
      )}
      <pre className="overflow-x-auto rounded-xl bg-slate-900/[.04] p-3.5 pr-16 font-mono text-[11px] leading-relaxed dark:bg-white/[.04]">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {}
        }}
        className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-900/15 bg-offwhite/80 px-2.5 py-1.5 text-[11px] font-medium transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15 dark:bg-slateDeep-900/80"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Tersalin" : label}
      </button>
    </div>
  );
}

function Tutorial({ baseUrl, apiKey }: { baseUrl: string; apiKey: string }) {
  const command = "npx --yes @buatprem/autosetup@latest";

  const claudeConfig = `{
  "model": "sonnet",
  "hasCompletedOnboarding": true,
  "permissions": {
    "defaultMode": "bypassPermissions"
  },
  "env": {
    "ANTHROPIC_BASE_URL": "${baseUrl.replace(/\/v1$/, "")}",
    "ANTHROPIC_AUTH_TOKEN": "${apiKey}",
    "ANTHROPIC_DEFAULT_FABLE_MODEL": "gpt-5.6-sol",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-5.2",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "kimi-k3",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-pro"
  }
}`;

  const codexConfig = `model = "gpt-5.6-sol"
model_provider = "bandelbanget"
approval_policy = "never"
sandbox_mode = "danger-full-access"

[model_providers.bandelbanget]
name = "BandelBanget"
base_url = "${baseUrl}"
env_key = "BANDELBANGET_API_KEY"
wire_api = "responses"
request_max_retries = 3
stream_max_retries = 3
stream_idle_timeout_ms = 300000`;

  return (
    <div className="space-y-4">
      <section className="glass p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-crimson-500">
            <Terminal className="h-4 w-4" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Setup otomatis (semua tools)</h3>
          </div>
        </header>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Cara tercepat — jalankan satu perintah ini di terminal, nanti API key & Base URL kamu terisi otomatis.
        </p>
        <div className="mt-3">
          <CodeBlock code={command} label="Salin perintah" lang="bash" />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <TutCard title="Setup VSCode" defaultOpen>
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tonton panduan setup VSCode di bawah ini:
            </p>
            <VideoEmbed src="https://www.youtube-nocookie.com/embed/JsrCHUkFuH4" title="Setup VSCode" />
          </div>
        </TutCard>

        <TutCard title="Setup OpenCode">
          <div className="space-y-4">
            <ol className="space-y-3">
              <Step number={1} title="Buka terminal">
                Gunakan Terminal, PowerShell, atau CMD.
              </Step>
              <Step number={2} title="Jalankan perintah">
                <CodeBlock code={command} label="Salin perintah" lang="bash" />
              </Step>
              <Step number={3} title="Isi data API">
                Gunakan Base URL dan API key dari tab Kuota.
              </Step>
            </ol>
            <VideoEmbed src="https://www.youtube-nocookie.com/embed/yMuxkKcuGww" title="Setup OpenCode" />
          </div>
        </TutCard>

        <TutCard title="Setup Claude Code">
          <div className="space-y-4">
            <ol className="space-y-3">
              <Step number={1} title="Edit file settings">
                Buka <code className="rounded bg-slate-900/[.04] px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/[.04]">~/.claude/settings.json</code> lalu ganti seluruh kontennya:
              </Step>
              <Step number={2} title="Tempel konfigurasi">
                <CodeBlock code={claudeConfig} label="Salin config" lang="json" />
              </Step>
              <Step number={3} title="Simpan & buka ulang">
                Save file, lalu tutup dan buka ulang Claude Code.
              </Step>
            </ol>
            <p className="rounded-xl bg-crimson/5 px-3.5 py-2.5 text-[11px] text-slate-500 dark:text-slate-400">
              Ganti <code className="rounded bg-slate-900/[.04] px-1 py-0.5 font-mono dark:bg-white/[.04]">YOUR_CUSTOMER_API_KEY</code> dengan API key dari tab Kuota —{" "}
              {apiKey.startsWith("sk-") ? (
                <>contoh di atas sudah memakai key kamu.</>
              ) : (
                <>tampilkan key di tab Kuota lalu salin config ini lagi.</>
              )}
            </p>
          </div>
        </TutCard>

        <TutCard title="Setup Codex">
          <div className="space-y-4">
            <ol className="space-y-3">
              <Step number={1} title="Edit file config">
                Buka <code className="rounded bg-slate-900/[.04] px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/[.04]">~/.codex/config.toml</code> lalu ganti seluruh kontennya:
              </Step>
              <Step number={2} title="Tempel konfigurasi">
                <CodeBlock code={codexConfig} label="Salin config" lang="toml" />
              </Step>
              <Step number={3} title="Set API key">
                Export variable <code className="rounded bg-slate-900/[.04] px-1 py-0.5 font-mono text-[11px] dark:bg-white/[.04]">BANDELBANGET_API_KEY</code> dengan API key dari tab Kuota, lalu buka ulang Codex.
              </Step>
            </ol>
          </div>
        </TutCard>

        <TutCard title="Setup 9Router">
          <div className="space-y-4">
            <ol className="space-y-3">
              <Step number={1} title="Install">
                Jalankan <code className="rounded bg-slate-900/[.04] px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/[.04]">npm install -g 9router</code>.
              </Step>
              <Step number={2} title="Tambah provider">
                Pilih OpenAI Compatible. Base URL: <code className="break-all rounded bg-slate-900/[.04] px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/[.04]">{baseUrl}</code>.
              </Step>
              <Step number={3} title="Tambah key">
                Masukkan API key dari tab Kuota, lalu import model dari{" "}
                <code className="rounded bg-slate-900/[.04] px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/[.04]">/models</code>.
              </Step>
            </ol>
            <VideoEmbed src="https://www.youtube-nocookie.com/embed/tu-F3AjxPmc" title="Setup 9Router" />
          </div>
        </TutCard>
      </div>
    </div>
  );
}
