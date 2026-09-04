"use client";

import { motion } from "framer-motion";
import { Boxes, Gauge, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import { features } from "@/lib/content";

const icons: Record<string, LucideIcon> = { Zap, ShieldCheck, Boxes, Gauge };

export default function Features() {
  return (
    <section id="features" className="container-x scroll-mt-20 py-16 sm:py-20">
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Yang kamu dapat <span className="text-crimson-500">di setiap key</span>
        </h2>
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          Standar, bukan fitur tambahan. Semua key punya kemampuan yang sama.
        </p>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => {
          const Icon = icons[f.icon];
          return (
            <motion.li
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass neon-ring flex flex-col p-6 transition hover:-translate-y-1"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-crimson/10 text-crimson-500">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.desc}</p>
              <span className="mt-5 font-mono text-xs uppercase tracking-[0.1em] text-crimson-500">{f.metric}</span>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
