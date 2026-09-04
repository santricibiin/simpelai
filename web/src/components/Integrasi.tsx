"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Copy, Terminal } from "lucide-react";
import { useState } from "react";
import { snippets } from "@/lib/content";

const meta = [
  { label: "Base URL", value: "https://buatprem.biz.id/v1" },
  { label: "Auth header", value: "Authorization: Bearer sk-nf-…" },
  { label: "Daftar model", value: "GET /v1/models" },
];

export default function Integrasi() {
  const still = useReducedMotion();
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const snippet = snippets[active];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="integrasi" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="aurora right-[8%] top-1/3 h-64 w-72 bg-crimson-400/12 [animation-delay:-3s]" />

      <div className="container-x relative grid gap-10 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <span className="pill text-crimson-500">
            <span className="h-1.5 w-1.5 rounded-full bg-crimson-500" />
            integrasi
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tighter sm:text-[2.75rem] sm:leading-[1.1]">
            Cukup ganti <span className="text-gradient">base URL</span>
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            Gateway kami mengikuti format OpenAI. Kalau kodemu sudah pakai SDK OpenAI, tinggal tukar{" "}
            <code className="rounded-md bg-crimson/10 px-1.5 py-0.5 font-mono text-xs text-crimson-500">
              base_url
            </code>{" "}
            dan API key — sisanya tidak perlu diubah.
          </p>

          <dl className="mt-8 space-y-3">
            {meta.map((m) => (
              <div
                key={m.label}
                className="group flex flex-col gap-1 rounded-2xl border border-slate-900/[.07] bg-white/40 px-4 py-3 transition hover:border-crimson/25 dark:border-white/[.07] dark:bg-white/[.02]"
              >
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {m.label}
                </dt>
                <dd className="break-all font-mono text-xs text-slate-700 transition group-hover:text-crimson-500 dark:text-slate-200">
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <motion.div
          initial={still ? false : { opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="card card-edge min-w-0"
        >
          {/* window chrome */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-900/[.07] px-4 py-3 dark:border-white/[.07]">
            <span aria-hidden="true" className="hidden items-center gap-1.5 pr-2 sm:flex">
              <span className="h-2.5 w-2.5 rounded-full bg-crimson/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/40" />
            </span>
            <Terminal className="h-4 w-4 shrink-0 text-crimson-500 sm:hidden" />

            <div
              role="tablist"
              aria-label="Pilih bahasa"
              className="flex flex-wrap gap-1 rounded-xl bg-slate-900/[.04] p-1 dark:bg-white/[.04]"
            >
              {snippets.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  role="tab"
                  aria-selected={active === i}
                  onClick={() => setActive(i)}
                  className={`relative rounded-lg px-3 py-1.5 font-mono text-[11px] transition duration-300 ${
                    active === i
                      ? "bg-crimson text-offwhite shadow-neon"
                      : "text-slate-500 hover:text-crimson-500 dark:text-slate-400"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={copy}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-900/[.12] px-2.5 py-1.5 font-mono text-[11px] transition duration-300 hover:border-crimson-500 hover:text-crimson-500 dark:border-white/[.12]"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copied ? "tersalin" : "copy"}
            </button>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-crimson/[.04] to-transparent" />
            <pre className="relative overflow-x-auto p-5 font-mono text-[11px] leading-[1.75] text-slate-700 sm:p-7 sm:text-xs dark:text-slate-300">
              <code>{snippet.code}</code>
            </pre>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
