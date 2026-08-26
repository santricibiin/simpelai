"use client";

import { PanelLeft, PanelTop } from "lucide-react";
import { useNavMode, type NavMode } from "./NavModeProvider";

const options: { mode: NavMode; label: string; icon: typeof PanelLeft }[] = [
  { mode: "vertical", label: "Sidebar vertikal", icon: PanelLeft },
  { mode: "horizontal", label: "Nav horizontal", icon: PanelTop },
];

export default function NavModeToggle() {
  const { mode, setMode } = useNavMode();

  return (
    <div
      role="group"
      aria-label="Tata letak navigasi"
      className="hidden items-center gap-0.5 rounded-lg border border-slate-900/10 p-0.5 lg:flex dark:border-white/10"
    >
      {options.map((o) => {
        const active = mode === o.mode;
        return (
          <button
            key={o.mode}
            type="button"
            onClick={() => setMode(o.mode)}
            aria-label={o.label}
            aria-pressed={active}
            title={o.label}
            className={`grid h-8 w-8 place-items-center rounded-md transition ${
              active ? "bg-crimson text-offwhite" : "text-slate-500 hover:text-crimson-500 dark:text-slate-400"
            }`}
          >
            <o.icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
