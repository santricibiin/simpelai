"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("nf-theme", next ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      className="grid h-10 w-10 place-items-center rounded-xl border border-slate-900/10 bg-white/60 transition hover:border-crimson-600 dark:border-white/10 dark:bg-white/5"
    >
      {dark ? <Sun className="h-5 w-5 text-crimson-400" /> : <Moon className="h-5 w-5 text-crimson" />}
    </button>
  );
}
