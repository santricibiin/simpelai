"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { SiteName } from "@/components/SiteName";
import LogoutButton from "./LogoutButton";
import { IconOrb } from "./Motion";
import NavModeToggle from "./NavModeToggle";
import { NavModeProvider, useNavMode } from "./NavModeProvider";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";

function Shell({ email, siteName, children }: { email: string; siteName: string; children: React.ReactNode }) {
  const { mode } = useNavMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const vertical = mode === "vertical";

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-slate-900/10 bg-offwhite/80 backdrop-blur-xl dark:border-white/10 dark:bg-slateDeep-900/80">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka navigasi"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-900/10 lg:hidden dark:border-white/10"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>

          <a href="/" className="flex shrink-0 items-center gap-2 font-display font-semibold">
            <IconOrb name="Cpu" size="sm" spin />
            <SiteName name={siteName} className="hidden sm:inline" />
          </a>
          <span className="rounded-full border border-crimson/30 bg-crimson/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-crimson-500">
            admin
          </span>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-[12rem] truncate text-xs text-slate-500 xl:inline dark:text-slate-400">
              {email}
            </span>
            <NavModeToggle />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>

        {!vertical && <TopNav />}
      </header>

      <div className="flex">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} desktop={vertical} />
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}

export default function AdminShell({
  email,
  siteName,
  children,
}: {
  email: string;
  siteName: string;
  children: React.ReactNode;
}) {
  return (
    <NavModeProvider>
      <Shell email={email} siteName={siteName}>
        {children}
      </Shell>
    </NavModeProvider>
  );
}
