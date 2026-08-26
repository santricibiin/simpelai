"use client";

import { motion } from "framer-motion";
import { Check, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Settings } from "@/lib/api";

export default function SiteSettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [name, setName] = useState(initial.site_name);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = name.trim() !== initial.site_name;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    setError(null);

    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_name: name, site_tagline: initial.site_tagline }),
    }).catch(() => null);

    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setError(data?.error ?? "Gagal menyimpan.");
      setState("idle");
      return;
    }

    setState("saved");
    router.refresh();
    setTimeout(() => setState("idle"), 2000);
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <label htmlFor="site_name" className="sr-only">
          Nama website
        </label>
        <input
          id="site_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={60}
          placeholder="Nama website"
          className="w-full rounded-xl border border-slate-900/15 bg-transparent px-4 py-3 text-sm outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15"
        />
        {error && (
          <p role="alert" className="mt-2 text-xs text-crimson-400">
            {error}
          </p>
        )}
      </div>

      <motion.button
        type="submit"
        disabled={state === "saving" || !dirty}
        whileTap={{ scale: 0.97 }}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-crimson px-5 py-3 text-sm font-semibold text-offwhite shadow-neon transition hover:bg-crimson-600 disabled:opacity-50"
      >
        {state === "saving" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "saved" ? (
          <Check className="h-4 w-4" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {state === "saved" ? "Tersimpan" : "Simpan"}
      </motion.button>
    </form>
  );
}
