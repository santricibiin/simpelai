"use client";

import { motion } from "framer-motion";
import { ArrowRight, KeyRound, Sparkles } from "lucide-react";
import AiNodeVisual from "./AiNodeVisual";

const stats = [
  { k: "42ms", v: "p50 latency" },
  { k: "40+", v: "model LLM" },
  { k: "8.2B", v: "token / hari" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:44px_44px] opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-crimson/20 blur-[110px]" />

      <div className="container-x relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:gap-8 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="min-w-0"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-crimson/30 bg-crimson/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-crimson-500">
            <Sparkles className="h-3.5 w-3.5" /> Inference Grid v4
          </span>

          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.12] tracking-tighter sm:text-5xl lg:text-6xl">
            Token LLM tanpa
            <span className="block bg-gradient-to-r from-crimson via-crimson-400 to-crimson-600 bg-clip-text text-transparent">
              batas latency.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
            Satu API key untuk 40+ model. Routing otomatis ke node tercepat, billing per token, dan
            SDK OpenAI-compatible yang langsung jalan tanpa refactor.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-crimson px-6 py-3.5 text-sm font-semibold text-offwhite shadow-neon transition hover:bg-crimson-600"
            >
              <KeyRound className="h-4 w-4" /> Get API Key
            </a>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-900/15 px-6 py-3.5 text-sm font-semibold transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
            >
              View Pricing <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-3 sm:gap-6">
            {stats.map((s) => (
              <div key={s.v} className="glass px-3 py-4 sm:px-4">
                <dt className="font-display text-xl font-semibold text-crimson-500 sm:text-2xl">{s.k}</dt>
                <dd className="mt-1 text-[11px] uppercase tracking-wider text-slate-500 sm:text-xs dark:text-slate-400">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
          className="order-first min-w-0 lg:order-none"
        >
          <AiNodeVisual />
        </motion.div>
      </div>
    </section>
  );
}
