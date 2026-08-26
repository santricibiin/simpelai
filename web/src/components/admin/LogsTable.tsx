"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { LogsResponse } from "@/lib/api";

const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${n}ms`);

const clock = (iso: string) => {
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime())
    ? iso.slice(11, 19)
    : d.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const tone = (code: number) =>
  code >= 500
    ? "bg-crimson/15 text-crimson-400"
    : code >= 400
      ? "bg-amber-500/15 text-amber-500"
      : "bg-emerald-500/10 text-emerald-400";

const latencyTone = (n: number) =>
  n > 10_000 ? "text-crimson-400" : n > 3000 ? "text-amber-500" : "text-slate-600 dark:text-slate-300";

export default function LogsTable({ initial }: { initial: LogsResponse }) {
  const router = useRouter();
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [model, setModel] = useState("");
  const [user, setUser] = useState("");
  const [busy, setBusy] = useState(false);

  const models = useMemo(
    () => [...new Set(initial.rows.map((r) => r.model))].sort(),
    [initial.rows],
  );

  const users = useMemo(
    () => [...new Set(initial.rows.map((r) => r.user_email).filter((v): v is string => !!v))].sort(),
    [initial.rows],
  );

  const refresh = () => {
    setBusy(true);
    router.refresh();
    setTimeout(() => setBusy(false), 600);
  };

  const rows = useMemo(
    () =>
      initial.rows.filter(
        (r) =>
          (!onlyFailed || r.status_code >= 400) &&
          (!model || r.model === model) &&
          (!user || r.user_email === user),
      ),
    [initial.rows, onlyFailed, model, user],
  );

  const filtered = model !== "" || user !== "" || onlyFailed;

  const view = useMemo(() => {
    const lat = rows.map((r) => r.latency_ms).filter((n) => n > 0).sort((a, b) => a - b);
    const pick = (f: number) => (lat.length ? lat[Math.min(lat.length - 1, Math.round((lat.length - 1) * f))] : 0);
    return {
      total: rows.length,
      failed: rows.filter((r) => r.status_code >= 400).length,
      tokens: rows.reduce((s, r) => s + r.prompt_tokens + r.completion_tokens, 0),
      p50_ms: pick(0.5),
      p95_ms: pick(0.95),
      avg_ms: lat.length ? Math.round(lat.reduce((s, n) => s + n, 0) / lat.length) : 0,
    };
  }, [rows]);

  const stats = filtered ? view : initial.stats;
  const successRate = stats.total ? (((stats.total - stats.failed) / stats.total) * 100).toFixed(1) : "—";

  const cards = [
    { label: filtered ? "Request terfilter" : "Request 24 jam", value: stats.total.toLocaleString("id-ID") },
    { label: "Success rate", value: stats.total ? `${successRate}%` : "—" },
    { label: "Latency p50", value: ms(stats.p50_ms) },
    { label: "Latency p95", value: ms(stats.p95_ms) },
    { label: filtered ? "Token terfilter" : "Token 24 jam", value: stats.tokens.toLocaleString("id-ID") },
  ];

  return (
    <div className="space-y-5">
      <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <li key={c.label} className="glass p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              {c.label}
            </p>
            <p className="mt-2 font-display text-xl font-semibold tracking-tight">{c.value}</p>
          </li>
        ))}
      </ul>

      <div className="glass overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-900/10 px-4 py-3 dark:border-white/10">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-crimson-500">
            Request log
          </h2>

          <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="sr-only" htmlFor="filter-model">
              Filter model
            </label>
            <select
              id="filter-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="max-w-[11rem] truncate rounded-lg border border-slate-900/15 bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:border-crimson-500 dark:border-white/15"
            >
              <option value="" className="text-slate-900">
                semua model
              </option>
              {models.map((m) => (
                <option key={m} value={m} className="text-slate-900">
                  {m}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="filter-user">
              Filter user
            </label>
            <select
              id="filter-user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="max-w-[11rem] truncate rounded-lg border border-slate-900/15 bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:border-crimson-500 dark:border-white/15"
            >
              <option value="" className="text-slate-900">
                semua user
              </option>
              {users.map((u) => (
                <option key={u} value={u} className="text-slate-900">
                  {u}
                </option>
              ))}
            </select>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={onlyFailed}
                onChange={(e) => setOnlyFailed(e.target.checked)}
                className="h-3.5 w-3.5 accent-crimson"
              />
              Hanya gagal
            </label>

            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setModel("");
                  setUser("");
                  setOnlyFailed(false);
                }}
                className="rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-xs font-medium transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={refresh}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-xs font-medium transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-50 dark:border-white/15"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Muat ulang
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
            {filtered
              ? "Tidak ada request yang cocok dengan filter."
              : "Belum ada request. Log akan muncul otomatis setelah gateway dipakai."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-900/10 text-[10px] uppercase tracking-[0.1em] text-slate-400 dark:border-white/10">
                <tr>
                  <th className="px-4 py-2 font-medium">Waktu</th>
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Key</th>
                  <th className="px-4 py-2 font-medium">Model</th>
                  <th className="px-4 py-2 font-medium">Provider</th>
                  <th className="px-4 py-2 text-right font-medium">Token</th>
                  <th className="px-4 py-2 text-right font-medium">Latency</th>
                  <th className="px-4 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/5 dark:divide-white/5">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-crimson/5">
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {clock(r.created_at)}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-2">{r.user_email ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {r.key_name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-[11px]">
                      <button
                        type="button"
                        onClick={() => setModel(r.model)}
                        className="transition hover:text-crimson-500"
                        title={`Filter model ${r.model}`}
                      >
                        {r.model}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-500 dark:text-slate-400">
                      {r.provider_name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right font-mono text-[11px]">
                      {(r.prompt_tokens + r.completion_tokens).toLocaleString("id-ID")}
                      <span className="ml-1 text-slate-400">
                        ({r.prompt_tokens}/{r.completion_tokens})
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-2 text-right font-mono text-[11px] ${latencyTone(r.latency_ms)}`}>
                      {ms(r.latency_ms)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${tone(r.status_code)}`}>
                        {r.status_code}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
