"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Cpu, Loader2, Lock, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);

    if (!res) {
      setError("Tidak dapat menghubungi server.");
      setLoading(false);
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Login gagal.");
      setLoading(false);
      return;
    }

    router.replace(data.user?.role === "admin" ? next : "/");
    router.refresh();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass w-full max-w-md p-6 shadow-neon sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-crimson text-offwhite shadow-neon">
          <Cpu className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Grid Access</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Autentikasi operator NeuroForge</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@neuroforge.dev"
              className="w-full rounded-xl border border-slate-900/15 bg-transparent py-3 pl-10 pr-3 text-sm outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full rounded-xl border border-slate-900/15 bg-transparent py-3 pl-10 pr-3 text-sm outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15"
            />
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
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-crimson px-5 py-3.5 text-sm font-semibold text-offwhite shadow-neon transition hover:bg-crimson-600 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? "Menghubungkan grid" : "Masuk"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Belum punya akses?{" "}
        <a href="/#pricing" className="font-semibold text-crimson-500 hover:underline">
          Ambil API key
        </a>
      </p>
    </motion.div>
  );
}
