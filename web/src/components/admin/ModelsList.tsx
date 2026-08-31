"use client";

import { AlertTriangle, ChevronDown, Cpu, Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import type { BandelModel } from "@/lib/reseller";

const gradeTone = (g: string) =>
  g === "A"
    ? "bg-emerald-500/10 text-emerald-400"
    : g === "B"
      ? "bg-amber-500/10 text-amber-500"
      : g === "C"
        ? "bg-crimson/10 text-crimson-400"
        : "bg-slate-500/10 text-slate-400";

export default function ModelsList({ initial }: { initial: BandelModel[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const rows = initial.filter((m) => !search || m.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <section className="glass p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="bandel-models-body"
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 text-crimson-500">
          <Cpu className="h-4 w-4" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Model Aktif</h2>
          <span className="rounded-full bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] normal-case tracking-normal text-slate-400">
            {initial.length} model
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 sm:inline">
            {open ? "tutup" : "lihat"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      <div
        id="bandel-models-body"
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari model…"
              className="w-full rounded-lg border border-slate-900/15 bg-transparent px-3 py-1.5 text-xs outline-none transition focus:border-crimson-500 sm:max-w-xs dark:border-white/15"
            />
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">
              multiplier = biaya token
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">Tidak ada model cocok.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-900/10 px-3.5 py-2.5 dark:border-white/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-semibold">{m.id}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      ×{m.multiplier} per token
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {m.vision && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] text-sky-400"
                        title="Mendukung input gambar"
                      >
                        <Eye className="h-3 w-3" />
                        vision
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${gradeTone(m.grade)}`}
                    >
                      {m.grade || "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
