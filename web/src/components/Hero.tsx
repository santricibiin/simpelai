"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import AiNodeVisual from "./AiNodeVisual";

const stats = [
  { k: "1 endpoint", v: "semua model" },
  { k: "OpenAI", v: "kompatibel" },
  { k: "< 5 mnt", v: "sampai routing" },
];

const trust = ["OpenAI SDK", "LangChain", "Cline", "Continue", "Cursor", "Roo Code"];

export default function Hero() {
  const still = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      {/* latar */}
      <div className="pointer-events-none absolute inset-0 bg-dot-grid bg-[size:22px_22px] opacity-[0.5] [mask-image:radial-gradient(ellipse_at_50%_20%,black,transparent_70%)] dark:opacity-[0.35]" />
      <div className="aurora -top-32 left-[8%] h-72 w-72 bg-crimson/25" />
      <div className="aurora -top-16 right-[6%] h-64 w-80 bg-crimson-400/20 [animation-delay:-6s]" />

      <div className="container-x relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-28">
        <motion.div
          initial={still ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0"
        >
          <span className="pill border-crimson/25 bg-crimson/[.07] text-crimson-500">
            <Sparkles className="h-3.5 w-3.5" />
            API Gateway untuk model AI
          </span>

          <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.06] tracking-tightest sm:text-6xl lg:text-[4.2rem]">
            Satu gerbang.
            <span className="text-gradient mt-1 block">Rutekan semua model AI.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
            NeuroForge adalah API gateway yang merutekan request kamu ke model AI terbaik —
            satu endpoint, satu API key, format OpenAI. Ganti base URL, dan semua SDK serta
            tool favoritmu langsung terhubung ke routing engine kami.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#cara-pakai" className="btn-primary group">
              <BookOpen className="h-4 w-4" />
              Lihat cara pakai
              <span className="pointer-events-none absolute inset-0 bg-shine bg-[length:200%_100%] opacity-0 transition-opacity duration-300 group-hover:animate-shine group-hover:opacity-100" />
            </a>
            <a href="/pricelist" className="btn-ghost group">
              Daftar harga
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>

          <dl className="mt-12 grid grid-cols-3 divide-x divide-slate-900/10 dark:divide-white/10">
            {stats.map((s, i) => (
              <motion.div
                key={s.v}
                initial={still ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 + i * 0.1 }}
                className="px-3 first:pl-0 sm:px-5"
              >
                <dt className="font-display text-2xl font-semibold tracking-tight text-crimson-500 sm:text-3xl">
                  {s.k}
                </dt>
                <dd className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {s.v}
                </dd>
              </motion.div>
            ))}
          </dl>
        </motion.div>

        <motion.div
          initial={still ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="order-first min-w-0 lg:order-none"
        >
          <AiNodeVisual />
        </motion.div>
      </div>

      {/* marquee kompatibilitas */}
      <div className="relative border-y border-slate-900/[.07] py-4 dark:border-white/[.07]">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-offwhite to-transparent dark:from-slateDeep-900" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-offwhite to-transparent dark:from-slateDeep-900" />
        <div className="flex w-max animate-marquee items-center gap-10 will-change-transform">
          {[...trust, ...trust].map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="whitespace-nowrap font-mono text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
