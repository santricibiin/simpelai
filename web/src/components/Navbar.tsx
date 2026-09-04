"use client";

import { Menu, X, Cpu } from "lucide-react";
import { useState } from "react";
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

  return (
    <header className="sticky top-0 z-50 border-b border-slate-900/10 bg-offwhite/80 backdrop-blur-xl dark:border-white/10 dark:bg-slateDeep-900/80">
      <nav className="container-x flex h-16 items-center justify-between gap-4">
        <a href="#" className="flex shrink-0 items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-crimson text-offwhite shadow-neon">
            <Cpu className="h-5 w-5" />
          </span>
          <SiteName name={siteName} />
        </a>

        <ul className="hidden items-center gap-8 text-sm font-medium md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-slate-600 transition hover:text-crimson-500 dark:text-slate-300">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="/login"
            className="hidden rounded-xl border border-slate-900/15 px-4 py-2.5 text-sm font-semibold transition hover:border-crimson-500 hover:text-crimson-500 sm:inline-block dark:border-white/15"
          >
            Login
          </a>
          <a
            href="/pricelist"
            className="hidden rounded-xl bg-crimson px-4 py-2.5 text-sm font-semibold text-offwhite shadow-neon transition hover:bg-crimson-600 sm:inline-block"
          >
            Daftar Harga
          </a>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label="Buka menu"
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-900/10 md:hidden dark:border-white/10"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <ul className="container-x flex flex-col gap-1 pb-4 md:hidden">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-crimson/10 dark:text-slate-200"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-crimson/10 dark:text-slate-200"
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
      )}
    </header>
  );
}
