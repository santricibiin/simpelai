"use client";

import { AlertTriangle, Check, Loader2, MessageCircle, Save, Send } from "lucide-react";
import { useState } from "react";

export default function ContactSettingsForm({ initial }: { initial: { telegram: string; whatsapp: string } }) {
  const [telegram, setTelegram] = useState(initial.telegram);
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = telegram !== initial.telegram || whatsapp !== initial.whatsapp;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegram, whatsapp }),
      }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Gagal (HTTP ${res.status}).`);
      setState("saved");
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan kontak.");
      setState("idle");
    }
  };

  const field =
    "w-full rounded-xl border border-slate-900/15 bg-transparent px-3.5 py-2.5 font-mono text-xs outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            <Send className="h-3 w-3" /> Telegram (tanpa @)
          </span>
          <input
            value={telegram}
            onChange={(e) => setTelegram(e.target.value.replace(/^@/, ""))}
            placeholder="wafasukataro"
            spellCheck={false}
            autoComplete="off"
            className={field}
          />
          <span className="mt-1.5 block text-[11px] text-slate-500 dark:text-slate-400">
            Ditampilkan sebagai tombol Telegram di halaman /contact.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            <MessageCircle className="h-3 w-3" /> WhatsApp (opsional)
          </span>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="628xxxxxxxxxx"
            spellCheck={false}
            autoComplete="off"
            className={field}
          />
          <span className="mt-1.5 block text-[11px] text-slate-500 dark:text-slate-400">
            Kosongkan kalau belum ada — tombol WhatsApp hanya muncul bila diisi.
          </span>
        </label>
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
        className="inline-flex items-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-50"
      >
        {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {state === "saving" ? "Menyimpan…" : state === "saved" ? "Tersimpan" : "Simpan kontak"}
      </button>
    </form>
  );
}
