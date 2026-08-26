"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronsLeft, X } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { navGroups } from "@/lib/nav";
import { NavIcon } from "./NavIcon";

function Badge({ value }: { value: string }) {
  if (value === "live") {
    return (
      <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-emerald-400">
        <span className="relative grid h-1.5 w-1.5 place-items-center">
          <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400/70" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        live
      </span>
    );
  }

  return (
    <span className="ml-auto grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-crimson px-1 text-[10px] font-semibold leading-none text-offwhite tabular-nums">
      {value}
    </span>
  );
}

function IconDot({ value }: { value: string }) {
  const live = value === "live";
  return (
    <span
      className={`pointer-events-none absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-offwhite dark:ring-slateDeep-900 ${
        live ? "bg-emerald-400" : "bg-crimson"
      }`}
    />
  );
}

function Items({
  collapsed,
  scope,
  onNavigate,
}: {
  collapsed: boolean;
  scope: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5 py-4">
      {navGroups.map((group) => (
        <div key={group.title}>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400"
              >
                {group.title}
              </motion.p>
            )}
          </AnimatePresence>

          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`group relative flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition ${
                      active
                        ? "font-medium text-crimson-400"
                        : "text-slate-600 hover:bg-crimson/5 dark:text-slate-300"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId={`navActiveBar-${scope}`}
                        className="absolute -left-3 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-crimson"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative flex shrink-0">
                      <NavIcon name={item.icon} active={active} scope={scope} />
                      {collapsed && item.badge && <IconDot value={item.badge} />}
                    </span>
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          className="flex min-w-0 flex-1 items-center gap-2 truncate"
                        >
                          <span className="truncate">{item.label}</span>
                          {item.badge && <Badge value={item.badge} />}
                        </motion.span>
                      )}
                    </AnimatePresence>
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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {desktop && (
        <motion.aside
          animate={{ width: collapsed ? 72 : 248 }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          className="sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 overflow-y-auto border-r border-slate-900/10 px-3 lg:block dark:border-white/10"
        >
          <Items collapsed={collapsed} scope="sidebar" />

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Perluas sidebar" : "Ringkas sidebar"}
            className="mb-4 flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-xs text-slate-500 transition hover:bg-crimson/5 hover:text-crimson-500 dark:text-slate-400"
          >
            <motion.span animate={{ rotate: collapsed ? 180 : 0 }} className="grid h-8 w-8 place-items-center">
              <ChevronsLeft className="h-[18px] w-[18px]" />
            </motion.span>
            {!collapsed && <span>Ringkas</span>}
          </button>
        </motion.aside>
      )}

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-slateDeep-900/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 w-[268px] overflow-y-auto border-r border-white/10 bg-offwhite px-3 lg:hidden dark:bg-slateDeep-900"
            >
              <div className="flex h-16 items-center justify-between">
                <span className="font-display text-sm font-semibold">Navigasi</span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup navigasi"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-slate-900/10 dark:border-white/10"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>
              <Items collapsed={false} scope="drawer" onNavigate={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
