"use client";

import { AlertTriangle, Coins, Gauge, Loader2, RefreshCw, TrendingDown, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ResellerQuota } from "@/lib/reseller";

const nf = new Intl.NumberFormat("id-ID");
const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);

const clock = (d: Date) =>
  d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function ResellerBalance({ initial }: { initial: ResellerQuota | null }) {
  const [data, setData] = useState<ResellerQuota | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(initial ? new Date() : null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reseller/quota", { cache: "no-store" }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Gagal (HTTP ${res.status}).`);
      setData(body as ResellerQuota);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat saldo reseller.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!initial) load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [initial, load]);

  const used = data ? Math.max(0, data.totalQuota - data.quota) : 0;
  const remaining = data ? data.quota : 0;
  const pct = data && data.totalQuota > 0 ? (used / data.totalQuota) * 100 : 0;

  const cards = data
    ? [
        { icon: Coins, label: "Saldo", value: nf.format(data.balance), hint: "balance reseller" },
        { icon: Wallet, label: "Sisa kuota", value: compact(remaining), hint: nf.format(remaining) },
        { icon: TrendingDown, label: "Kuota terpakai", value: compact(used), hint: nf.format(used) },
        { icon: Gauge, label: "Total kuota", value: compact(data.totalQuota), hint: nf.format(data.totalQuota) },
      ]
    : [];

  return (
    <div className="space-y-6">
      {error && (
        <p
          role="alert"
          className="glass flex items-start gap-2 border-crimson/40 p-4 text-xs text-crimson-400"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.length > 0
          ? cards.map((c) => (
              <li key={c.label} className="glass p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                    {c.label}
                  </span>
                  <c.icon className="h-4 w-4 shrink-0 text-crimson-500" />
                </div>
                <p className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{c.value}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">{c.hint}</p>
              </li>
            ))
          : [0, 1, 2, 3].map((i) => (
              <li key={i} className="glass p-5">
                <div className="h-3 w-20 animate-pulse rounded bg-slate-900/10 dark:bg-white/10" />
                <div className="mt-4 h-7 w-28 animate-pulse rounded bg-slate-900/10 dark:bg-white/10" />
              </li>
            ))}
      </ul>

      {data && (
        <section className="glass p-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-crimson-500">
              <Gauge className="h-4 w-4" />
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Pemakaian kuota</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] uppercase text-emerald-400">
                {data.resellerId}
              </span>
              <button
                type="button"
                onClick={load}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-xs font-medium transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-50 dark:border-white/15"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Refresh
              </button>
            </div>
          </header>

          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                terpakai <span className="text-crimson-500">{compact(used)}</span> dari {compact(data.totalQuota)} token
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
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-slate-400">
              <span>{pct.toFixed(2)}% terpakai</span>
              {updatedAt && <span>diperbarui {clock(updatedAt)} · auto-refresh tiap 60s</span>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
