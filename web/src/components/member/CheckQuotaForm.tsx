"use client";

import { AlertTriangle, Gauge, Loader2, Search } from "lucide-react";
import { useState } from "react";

type Result = {
  name: string;
  status: string;
  keyMasked: string;
  maxTokens: number;
  usedTokens: number;
  remainingTokens: number;
  expiresAt: string | null;
  validDays: number | null;
};

const nf = new Intl.NumberFormat("id-ID");
const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);
const clock = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

export default function CheckQuotaForm() {
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/member/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Gagal (HTTP ${res.status}).`);
      setResult(data as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengecek kuota.");
    } finally {
      setBusy(false);
    }
  };

  const pct = result && result.maxTokens > 0 ? (result.usedTokens / result.maxTokens) * 100 : 0;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <form onSubmit={submit} className="glass space-y-4 p-6">
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-crimson/10">
            <Gauge className="h-5 w-5 text-crimson-500" />
          </span>
          <h1 className="mt-3 font-display text-xl font-semibold tracking-tight">Cek Kuota</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Masukkan API key kamu untuk melihat sisa kuota.
          </p>
        </div>

        <input
          required
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          spellCheck={false}
          autoComplete="off"
          className="w-full rounded-xl border border-slate-900/15 bg-transparent px-4 py-3 font-mono text-xs outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15"
        />

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs text-crimson-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || apiKey.trim().length < 12}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-crimson px-5 py-3 text-sm font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {busy ? "Mencari…" : "Cek sekarang"}
        </button>
      </form>

      {result && (
        <section className="glass space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display text-base font-semibold">{result.name}</p>
              <p className="font-mono text-[10px] text-slate-400">{result.keyMasked}</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase ${
                result.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-crimson/10 text-crimson-400"
              }`}
            >
              {result.status}
            </span>
          </div>

          <ul className="grid grid-cols-3 gap-3">
            {[
              { label: "Sisa", value: compact(result.remainingTokens) },
              { label: "Terpakai", value: compact(result.usedTokens) },
              { label: "Max", value: compact(result.maxTokens) },
            ].map((c) => (
              <li key={c.label} className="rounded-xl bg-slate-900/[.04] p-3 dark:bg-white/[.04]">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">{c.label}</p>
                <p className="mt-1 font-display text-lg font-semibold">{c.value}</p>
              </li>
            ))}
          </ul>

          <div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-crimson to-crimson-600"
                style={{ width: `${Math.min(100, Math.max(0.5, pct))}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-slate-400">
              <span>{pct.toFixed(2)}% terpakai</span>
              <span>berakhir {clock(result.expiresAt)}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
