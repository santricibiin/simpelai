"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Boxes, Gauge, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import { features } from "@/lib/content";

const icons: Record<string, LucideIcon> = { Zap, ShieldCheck, Boxes, Gauge };

export default function Features() {
  const still = useReducedMotion();

  return (
    <section id="features" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="container-x relative">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="pill text-crimson-500">
              <span className="h-1.5 w-1.5 rounded-full bg-crimson-500" />
              kapabilitas
            </span>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tighter sm:text-[2.75rem] sm:leading-[1.1]">
              Yang kamu dapat <span className="text-gradient">di setiap key</span>
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              Standar, bukan fitur tambahan. Semua key punya kemampuan yang sama.
            </p>
          </div>

          <a href="/pricelist" className="btn-ghost group hidden sm:inline-flex">
            Lihat paket
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>
        </div>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => {
            const Icon = icons[f.icon];
            return (
              <motion.li
                key={f.title}
                initial={still ? false : { opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                className="card card-hover card-edge group flex flex-col p-6"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-crimson/10 text-crimson-500 ring-1 ring-inset ring-crimson/15 transition duration-300 group-hover:bg-crimson group-hover:text-offwhite">
                  <Icon className="h-5 w-5" />
                </span>

                <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {f.desc}
                </p>

                <span className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-crimson/[.07] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-crimson-500">
                  {f.metric}
                </span>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
