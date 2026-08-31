"use client";

import { AlertTriangle, Check, Eye, EyeOff, KeyRound, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResellerKeyForm({
  initialMasked,
  initialSource,
}: {
  initialMasked: string | null;
  initialSource: "file" | "env" | "none";
}) {
  const router = useRouter();
  const [masked, setMasked] = useState(initialMasked);
  const [source, setSource] = useState(initialSource);
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    setError(null);

    try {
      const res = await fetch("/api/reseller/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Gagal (HTTP ${res.status}).`);

      setState("saved");
      setKey("");
      setShow(false);

      const info = await fetch("/api/reseller/key", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
      if (info?.masked) {
        setMasked(info.masked);
        setSource(info.source ?? "file");
      }

      router.refresh();
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan key.");
      setState("idle");
    }
  };

  const field =
    "w-full rounded-xl border border-slate-900/15 bg-transparent px-3.5 py-2.5 font-mono text-xs outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-900/[.04] px-3.5 py-2.5 dark:bg-white/[.04]">
        <KeyRound className="h-4 w-4 shrink-0 text-crimson-500" />
        <span className="text-xs text-slate-500 dark:text-slate-400">Key aktif:</span>
        <span className="font-mono text-xs">{masked ?? "belum dikonfigurasi"}</span>
        <span className="ml-auto rounded-full bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-400">
          {source === "file" ? "tersimpan di panel" : source === "env" ? "dari .env" : "tidak ada"}
        </span>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          API key reseller baru
        </span>
        <div className="relative">
          <input
            required
            type={show ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="rsl_..."
            autoComplete="off"
            spellCheck={false}
            className={`${field} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Sembunyikan key" : "Tampilkan key"}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 transition hover:text-crimson-500"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <span className="mt-1.5 block text-[11px] text-slate-500 dark:text-slate-400">
          Key divalidasi ke bandelbanget.xyz sebelum disimpan. Rotate key maksimal 1x per jam — key lama langsung
          mati.
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
        disabled={state === "saving" || state === "saved" || !key.trim()}
        className="inline-flex items-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-50"
      >
        {state === "saving" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "saved" ? (
          <Check className="h-4 w-4" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {state === "saving" ? "Memvalidasi" : state === "saved" ? "Tersimpan" : "Validasi & simpan"}
      </button>
    </form>
  );
}
