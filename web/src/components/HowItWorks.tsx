"use client";

import { motion } from "framer-motion";
import { steps } from "@/lib/content";

export default function HowItWorks() {
  return (
    <section id="cara-pakai" className="container-x scroll-mt-20 py-16 sm:py-20">
      <div className="max-w-2xl">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-crimson-500">cara pakai</span>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Empat langkah, <span className="text-crimson-500">langsung jalan</span>
        </h2>
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          Tanpa approval manual, tanpa nunggu lama. Dari bayar sampai request pertama biasanya di bawah
          lima menit.
        </p>
      </div>

      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <motion.li
            key={s.n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: i * 0.09 }}
            className="glass neon-ring relative flex flex-col p-6"
          >
            <span
              aria-hidden="true"
              className="font-display text-5xl font-semibold leading-none text-crimson/20 dark:text-crimson/25"
            >
              {s.n}
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{s.desc}</p>

            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 top-1/2 hidden h-px w-4 bg-gradient-to-r from-crimson/40 to-transparent lg:block"
              />
            )}
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
