"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PanelLeft, PanelTop } from "lucide-react";
import { useState } from "react";
import { useNavMode, type NavMode } from "./NavModeProvider";

const options: { mode: NavMode; label: string; icon: typeof PanelLeft }[] = [
  { mode: "vertical", label: "Sidebar vertikal", icon: PanelLeft },
  { mode: "horizontal", label: "Nav horizontal", icon: PanelTop },
];

export default function NavModeToggle() {
  const { mode, setMode } = useNavMode();
  const [hint, setHint] = useState<string | null>(null);

  return (
    <div className="relative">
      <div
        role="group"
        aria-label="Tata letak navigasi"
        className="flex items-center gap-0.5 rounded-xl border border-slate-900/10 bg-white/60 p-0.5 dark:border-white/10 dark:bg-white/5"
      >
        {options.map((o) => {
          const active = mode === o.mode;
          return (
            <motion.button
              key={o.mode}
              type="button"
              onClick={() => setMode(o.mode)}
              onMouseEnter={() => setHint(o.label)}
              onMouseLeave={() => setHint(null)}
              onFocus={() => setHint(o.label)}
              onBlur={() => setHint(null)}
              aria-label={o.label}
              aria-pressed={active}
              whileTap={{ scale: 0.92 }}
              className="relative grid h-9 w-9 place-items-center rounded-lg"
            >
              {active && (
                <motion.span
                  layoutId="navModePill"
                  className="absolute inset-0 rounded-lg bg-crimson shadow-neon"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <o.icon
                className={`relative h-[18px] w-[18px] transition-colors ${
                  active ? "text-offwhite" : "text-slate-500 dark:text-slate-400"
                }`}
              />
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {hint && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg border border-slate-900/10 bg-offwhite px-2.5 py-1.5 text-[11px] font-medium shadow-lg dark:border-white/10 dark:bg-slateDeep-800"
          >
            {hint}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
