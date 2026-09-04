"use client";

import { motion } from "framer-motion";
import { Check, Copy, Terminal } from "lucide-react";
import { useState } from "react";
import { snippets } from "@/lib/content";

export default function Integrasi() {
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
    <section id="integrasi" className="container-x scroll-mt-20 py-16 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-crimson-500">integrasi</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Cukup ganti <span className="text-crimson-500">base URL</span>
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            Gateway kami mengikuti format OpenAI. Kalau kodemu sudah pakai SDK OpenAI, tinggal tukar
            <code className="mx-1 rounded bg-crimson/10 px-1.5 py-0.5 font-mono text-xs text-crimson-500">
              base_url
            </code>
            dan API key — sisanya tidak perlu diubah.
          </p>

          <dl className="mt-8 space-y-4 text-sm">
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-400">Base URL</dt>
              <dd className="mt-1 break-all font-mono text-xs text-crimson-500">
                https://buatprem.biz.id/v1
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-400">Auth header</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-600 dark:text-slate-300">
                Authorization: Bearer sk-nf-…
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-400">Daftar model</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-600 dark:text-slate-300">
                GET /v1/models
              </dd>
            </div>
          </dl>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="glass neon-ring min-w-0 overflow-hidden"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-900/10 px-4 py-3 dark:border-white/10">
            <Terminal className="h-4 w-4 shrink-0 text-crimson-500" />
            <div role="tablist" aria-label="Pilih bahasa" className="flex flex-wrap gap-1">
              {snippets.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  role="tab"
                  aria-selected={active === i}
                  onClick={() => setActive(i)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-[11px] transition ${
                    active === i
                      ? "bg-crimson text-offwhite"
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
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-900/15 px-2.5 py-1 font-mono text-[11px] transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "tersalin" : "copy"}
            </button>
          </div>

          <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-slate-700 sm:p-6 sm:text-xs dark:text-slate-300">
            <code>{snippet.code}</code>
          </pre>
        </motion.div>
      </div>
    </section>
  );
}
