"use client";

import { AlertTriangle, Check, Globe, Loader2, Save } from "lucide-react";
import { useState } from "react";

export default function BandelDomainForm({ initial }: { initial: string }) {
  const [domain, setDomain] = useState(initial);
  const [current, setCurrent] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = domain.trim().toLowerCase() !== current.toLowerCase();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    setError(null);

    try {
      const res = await fetch("/api/reseller/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Gagal (HTTP ${res.status}).`);

      setCurrent(data.domain ?? domain.trim());
      setState("saved");
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan domain.");
      setState("idle");
    }
  };

  const field =
    "w-full rounded-xl border border-slate-900/15 bg-transparent px-3.5 py-2.5 font-mono text-xs outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-900/[.04] px-3.5 py-2.5 dark:bg-white/[.04]">
        <Globe className="h-4 w-4 shrink-0 text-crimson-500" />
        <span className="text-xs text-slate-500 dark:text-slate-400">Domain aktif:</span>
        <span className="font-mono text-xs font-semibold">{current}</span>
        <a
          href={`https://${current}/v1/models`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto font-mono text-[10px] text-crimson-500 hover:underline"
        >
          /v1/models ↗
        </a>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Domain baru untuk proxy bandel
        </span>
        <input
          required
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="ai.contoh.com"
          spellCheck={false}
          autoComplete="off"
          className={field}
        />
        <span className="mt-1.5 block text-[11px] text-slate-500 dark:text-slate-400">
          Arahkan A record domain ke IP VPS ini dulu. Saat disimpan, server otomatis memasang nginx + SSL
          Let&apos;s Encrypt dan memindahkan proxy ke domain baru — domain lama dinonaktifkan.
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs text-crimson-400"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "saving" || state === "saved" || !dirty}
        className="inline-flex items-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-50"
      >
        {state === "saving" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "saved" ? (
          <Check className="h-4 w-4" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {state === "saving" ? "Memasang nginx + SSL…" : state === "saved" ? "Tersimpan" : "Simpan & pasang"}
      </button>
    </form>
  );
}
