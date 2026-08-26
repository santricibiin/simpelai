"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { navGroups } from "@/lib/nav";
import { PanelIcon } from "./icons";

function Items({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5 py-4">
      {navGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition ${
                      active
                        ? "bg-crimson/10 font-medium text-crimson-500"
                        : "text-slate-600 hover:bg-crimson/5 dark:text-slate-300"
                    }`}
                  >
                    <PanelIcon name={item.icon} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function Sidebar({
  mobileOpen,
  onClose,
  desktop = true,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  desktop?: boolean;
}) {
  return (
    <>
      {desktop && (
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 overflow-y-auto border-r border-slate-900/10 px-3 lg:block dark:border-white/10">
          <Items />
        </aside>
      )}

      {mobileOpen && (
        <>
          <div
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-slateDeep-900/60 lg:hidden"
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi admin"
            className="fixed inset-y-0 left-0 z-[60] w-[min(84vw,260px)] overflow-y-auto border-r border-slate-900/10 bg-offwhite px-3 lg:hidden dark:border-white/10 dark:bg-slateDeep-900"
          >
            <div className="flex h-16 items-center justify-between">
              <span className="font-display text-sm font-semibold">Navigasi</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup navigasi"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-900/10 dark:border-white/10"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <Items onNavigate={onClose} />
          </aside>
        </>
      )}
    </>
  );
}
