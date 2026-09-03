"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { plans } from "@/lib/content";

export default function Pricing() {
  return (
    <section id="pricing" className="relative scroll-mt-20 py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto h-64 max-w-3xl rounded-full bg-crimson/15 blur-[100px]" />

      <div className="container-x relative">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Paket Token</h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            Pilih sesuai kebutuhan, bayar via QRIS, API key langsung aktif. Page order menyusul.
          </p>
        </div>

        <ul className="mt-12 grid items-start gap-6 lg:grid-cols-3">
          {plans.map((p, i) => (
            <motion.li
              key={p.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`glass relative flex flex-col p-6 sm:p-8 ${
                p.featured ? "border-crimson/40 shadow-neon lg:-translate-y-3" : "neon-ring"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-crimson px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-offwhite">
                  Paling populer
                </span>
              )}

              <h3 className="font-display text-xl font-semibold">{p.name}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{p.tagline}</p>

              <p className="mt-6 flex flex-wrap items-baseline gap-1.5">
                <span className="font-display text-4xl font-semibold tracking-tight">{p.price}</span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.unit}</span>
              </p>

              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-crimson-500" />
                    <span className="text-slate-600 dark:text-slate-300">{perk}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#docs"
                className={`mt-8 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition ${
                  p.featured
                    ? "bg-crimson text-offwhite hover:bg-crimson-600"
                    : "border border-slate-900/15 hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
                }`}
              >
                {p.cta}
              </a>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
