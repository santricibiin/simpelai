"use client";

import { Cpu } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { SiteName } from "@/components/SiteName";

export default function MemberHeader({ siteName }: { siteName: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-900/10 bg-offwhite/80 backdrop-blur-xl dark:border-white/10 dark:bg-slateDeep-900/80">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex shrink-0 items-center gap-2 font-display font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-crimson/10 text-crimson-500">
            <Cpu className="h-4 w-4" />
          </span>
          <SiteName name={siteName} className="hidden sm:inline" />
        </a>
        <span className="rounded-full border border-crimson/30 bg-crimson/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-crimson-500">
          member
        </span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
