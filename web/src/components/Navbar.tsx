"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Cpu } from "lucide-react";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { SiteName } from "./SiteName";

const links = [
  { href: "/#cara-pakai", label: "Cara Pakai" },
  { href: "/#integrasi", label: "Integrasi" },
  { href: "/pricelist", label: "Daftar Harga" },
  { href: "/cek-kuota", label: "Cek Kuota" },
];

export default function Navbar({ siteName }: { siteName: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-900/[.07] bg-offwhite/70 backdrop-blur-2xl dark:border-white/[.07] dark:bg-slateDeep-900/70"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="container-x flex h-16 items-center justify-between gap-4">
        <a
          href="/"
          className="group flex shrink-0 items-center gap-2.5 font-display text-lg font-semibold tracking-tight"
        >
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-crimson text-offwhite shadow-neon transition-transform duration-300 group-hover:scale-105">
            <Cpu className="h-5 w-5" />
          </span>
          <SiteName name={siteName} />
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="relative rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition duration-300 hover:bg-crimson/[.06] hover:text-crimson-500 dark:text-slate-300"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="/login"
            className="hidden rounded-xl border border-slate-900/[.12] px-4 py-2.5 text-sm font-semibold transition duration-300 hover:border-crimson-500 hover:text-crimson-500 sm:inline-block dark:border-white/[.12]"
          >
            Login
          </a>
          <a
            href="/pricelist"
            className="group relative hidden overflow-hidden rounded-xl bg-crimson px-4 py-2.5 text-sm font-semibold text-offwhite transition duration-300 hover:bg-crimson-600 hover:shadow-neon sm:inline-block"
          >
            Daftar Harga
            <span className="pointer-events-none absolute inset-0 bg-shine bg-[length:200%_100%] opacity-0 transition-opacity duration-300 group-hover:animate-shine group-hover:opacity-100" />
          </a>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label="Buka menu"
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-900/10 transition hover:border-crimson-500 md:hidden dark:border-white/10"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu-mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-slate-900/[.07] bg-offwhite/95 backdrop-blur-2xl md:hidden dark:border-white/[.07] dark:bg-slateDeep-900/95"
          >
            <ul className="container-x flex flex-col gap-1 py-4">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-crimson/[.07] hover:text-crimson-500 dark:text-slate-200"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="my-1">
              <span className="hairline block" />
            </li>
            <li>
              <a
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-crimson/[.07] dark:text-slate-200"
              >
                Login
              </a>
            </li>
            <li>
              <a
                href="/pricelist"
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-xl bg-crimson px-3 py-3 text-center text-sm font-semibold text-offwhite"
              >
                Daftar Harga
              </a>
            </li>
          </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
