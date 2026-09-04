"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";

export default function CtaBand() {
  const still = useReducedMotion();

  return (
    <section className="container-x pb-20 sm:pb-28">
      <motion.div
        initial={still ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="card card-edge relative overflow-hidden px-6 py-12 text-center sm:px-12 sm:py-16"
      >
        <div className="aurora left-1/2 top-0 h-48 w-[26rem] -translate-x-1/2 bg-crimson/20" />
        <div className="pointer-events-none absolute inset-0 bg-dot-grid bg-[size:22px_22px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)] dark:opacity-25" />

        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tighter sm:text-[2.5rem] sm:leading-[1.12]">
            Siap mulai routing? <span className="text-gradient">Pilih paketnya dulu.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-300">
            Bingung paket mana yang pas? Tanya dulu lewat kontak kami — dijawab manusia, bukan bot.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="/pricelist" className="btn-primary group">
              Lihat daftar harga
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              <span className="pointer-events-none absolute inset-0 bg-shine bg-[length:200%_100%] opacity-0 transition-opacity duration-300 group-hover:animate-shine group-hover:opacity-100" />
            </a>
            <a href="/contact" className="btn-ghost">
              <MessageCircle className="h-4 w-4" />
              Tanya dulu
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
