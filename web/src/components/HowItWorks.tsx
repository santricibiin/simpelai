"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CreditCard, KeyRound, Link2, ShoppingBag, type LucideIcon } from "lucide-react";
import { steps } from "@/lib/content";

const icons: LucideIcon[] = [ShoppingBag, CreditCard, KeyRound, Link2];

export default function HowItWorks() {
  const still = useReducedMotion();

  return (
    <section id="cara-pakai" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="aurora left-[12%] top-1/4 h-56 w-72 bg-crimson/12 [animation-delay:-9s]" />

      <div className="container-x relative">
        <div className="max-w-2xl">
          <span className="pill text-crimson-500">
            <span className="h-1.5 w-1.5 rounded-full bg-crimson-500" />
            cara pakai
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tighter sm:text-[2.75rem] sm:leading-[1.1]">
            Empat langkah, <span className="text-gradient">langsung jalan</span>
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            Tanpa approval manual, tanpa nunggu lama. Dari bayar sampai request pertama biasanya di bawah
            lima menit.
          </p>
        </div>

        <ol className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* garis penghubung desktop */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 top-[3.25rem] hidden h-px origin-left animate-none bg-gradient-to-r from-transparent via-crimson/25 to-transparent lg:block"
          />

          {steps.map((s, i) => {
            const Icon = icons[i] ?? ShoppingBag;
            return (
              <motion.li
                key={s.n}
                initial={still ? false : { opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="card card-hover card-edge group p-6"
              >
                {/* nomor jadi watermark */}
                <span
                  aria-hidden="true"
                  className="absolute -right-2 -top-4 font-display text-[5.5rem] font-semibold leading-none text-slate-900/[.04] transition-colors duration-300 group-hover:text-crimson/[.09] dark:text-white/[.04]"
                >
                  {s.n}
                </span>

                <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-crimson/10 text-crimson-500 ring-1 ring-inset ring-crimson/15 transition duration-300 group-hover:bg-crimson group-hover:text-offwhite">
                  <Icon className="h-5 w-5" />
                </span>

                <h3 className="relative mt-5 font-display text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {s.desc}
                </p>

                <span className="relative mt-6 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  langkah {s.n}
                </span>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
