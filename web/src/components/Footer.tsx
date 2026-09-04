"use client";

import { Cpu } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteName } from "./SiteName";

const nav = [
  {
    title: "Produk",
    items: [
      { label: "Cara Pakai", href: "/#cara-pakai" },
      { label: "Integrasi", href: "/#integrasi" },
      { label: "Daftar Harga", href: "/pricelist" },
    ],
  },
  {
    title: "Member",
    items: [
      { label: "Cek Kuota", href: "/cek-kuota" },
      { label: "Login", href: "/login" },
    ],
  },
  {
    title: "Bantuan",
    items: [{ label: "Kontak", href: "/contact" }],
  },
];

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function Footer({ siteName }: { siteName: string }) {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API}/api/status`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((d) => setStatus(d?.database === "up" ? "ok" : "down"))
      .catch(() => setStatus("down"));
    return () => ctrl.abort();
  }, []);

  const dot = { checking: "bg-amber-400", ok: "bg-emerald-400", down: "bg-crimson-400" }[status];
  const label = { checking: "Memeriksa…", ok: "All systems operational", down: "Degraded" }[status];

  return (
    <footer id="docs" className="relative border-t border-slate-900/[.07] pt-16 dark:border-white/[.07]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-crimson/30 to-transparent" />
      <div className="container-x grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <a href="/" className="group flex items-center gap-2.5 font-display text-lg font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-crimson text-offwhite transition-transform duration-300 group-hover:scale-105">
              <Cpu className="h-5 w-5" />
            </span>
            <SiteName name={siteName} />
          </a>
          <p className="mt-4 max-w-xs text-sm text-slate-600 dark:text-slate-400">
            Token AI siap pakai dengan API format OpenAI — beli, dapat key, langsung integrasi.
          </p>
          <p className="pill mt-5">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            {label}
          </p>
        </div>

        {nav.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-crimson-500">
              {col.title}
            </h3>
            <ul className="mt-5 space-y-3 text-sm">
              {col.items.map((it) => (
                <li key={it.href}>
                  <a
                    href={it.href}
                    className="text-slate-600 transition duration-300 hover:text-crimson-500 dark:text-slate-400"
                  >
                    {it.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="container-x mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-900/10 py-6 text-xs text-slate-500 sm:flex-row dark:border-white/10 dark:text-slate-400">
        <p>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
        <a href="/contact" className="font-mono text-[11px] uppercase tracking-[0.14em] transition hover:text-crimson-500">
          butuh bantuan? hubungi kami
        </a>
      </div>
    </footer>
  );
}
