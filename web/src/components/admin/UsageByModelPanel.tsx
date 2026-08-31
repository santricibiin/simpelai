"use client";

import { AlertTriangle, ChevronDown, HeartPulse, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { UsageByModel } from "@/lib/reseller";

const periods = [
  { id: "today", label: "Hari ini" },
  { id: "yesterday", label: "Kemarin" },
  { id: "week", label: "7 hari" },
  { id: "month", label: "30 hari" },
];

const rateTone = (r: number) =>
  r >= 95 ? "text-emerald-400" : r >= 70 ? "text-amber-500" : "text-crimson-400";

const barTone = (r: number) =>
  r >= 95
    ? "from-emerald-500 to-emerald-600"
    : r >= 70
      ? "from-amber-500 to-amber-600"
      : "from-crimson to-crimson-600";

export default function UsageByModelPanel({ initial }: { initial: UsageByModel | null }) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("today");
  const [data, setData] = useState<UsageByModel | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reseller/usage-by-model?period=${p}`, { cache: "no-store" }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `Gagal (HTTP ${res.status}).`);
      setData(body as UsageByModel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat usage.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (open && !data) load(period);
  }, [open, data, period, load]);

  const changePeriod = (p: string) => {
    setPeriod(p);
    load(p);
  };

  const byModel = data?.byModel ?? [];
  const byCustomer = data?.byCustomer ?? [];

  return (
    <section className="glass p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="usage-by-model-body"
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 text-crimson-500">
          <HeartPulse className="h-4 w-4" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">
            Kesehatan Model (Bandel)
          </h2>
          {data && (
            <span className="rounded-full bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] normal-case tracking-normal text-slate-400">
              {data.label}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 sm:inline">
            {open ? "tutup" : "lihat"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      <div
        id="usage-by-model-body"
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-slate-900/15 p-0.5 dark:border-white/15">
              {periods.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => changePeriod(p.id)}
                  aria-pressed={period === p.id}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    period === p.id
                      ? "bg-crimson text-offwhite"
                      : "text-slate-500 hover:text-crimson-500 dark:text-slate-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => load(period)}
              disabled={busy}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-xs font-medium transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-50 dark:border-white/15"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs text-crimson-400"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {data && (
            <>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {/* per model */}
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">
                    Per model · {byModel.length} model dipakai
                  </p>
                  <ul className="space-y-2">
                    {byModel.length === 0 && (
                      <li className="rounded-xl border border-slate-900/10 px-3 py-4 text-center text-xs text-slate-400 dark:border-white/10">
                        Belum ada pemakaian di periode ini.
                      </li>
                    )}
                    {byModel.map((m) => (
                      <li
                        key={m.model}
                        className="rounded-xl border border-slate-900/10 px-3.5 py-2.5 dark:border-white/10"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate font-mono text-xs font-semibold">{m.model}</span>
                          <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] text-slate-400">
                            <span>×{m.multiplier}</span>
                            <span className={`font-semibold ${rateTone(m.successRate)}`}>
                              {m.successRate.toFixed(1)}%
                            </span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${barTone(m.successRate)}`}
                            style={{ width: `${Math.max(2, m.successRate)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* per customer */}
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">
                    Per customer · {byCustomer.length} customer aktif
                  </p>
                  <ul className="space-y-2">
                    {byCustomer.length === 0 && (
                      <li className="rounded-xl border border-slate-900/10 px-3 py-4 text-center text-xs text-slate-400 dark:border-white/10">
                        Belum ada customer memakai model di periode ini.
                      </li>
                    )}
                    {byCustomer.map((c) => {
                      const avg =
                        c.models.length > 0
                          ? c.models.reduce((s, m) => s + m.successRate, 0) / c.models.length
                          : 0;
                      return (
                        <li
                          key={c.id}
                          className="rounded-xl border border-slate-900/10 px-3.5 py-2.5 dark:border-white/10"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-xs font-medium">{c.name}</span>
                            <span className={`shrink-0 font-mono text-[10px] font-semibold ${rateTone(avg)}`}>
                              rata-rata {avg.toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                            {c.models.map((m) => (
                              <span key={m.model} className="font-mono text-[10px] text-slate-400">
                                {m.model}{" "}
                                <span className={rateTone(m.successRate)}>{m.successRate.toFixed(0)}%</span>
                              </span>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
