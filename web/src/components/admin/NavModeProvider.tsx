"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type NavMode = "vertical" | "horizontal";

const KEY = "nf-nav-mode";

const Ctx = createContext<{ mode: NavMode; setMode: (m: NavMode) => void }>({
  mode: "vertical",
  setMode: () => {},
});

export const useNavMode = () => useContext(Ctx);

export function NavModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<NavMode>("vertical");

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "horizontal" || saved === "vertical") setModeState(saved);
  }, []);

  const setMode = (m: NavMode) => {
    setModeState(m);
    localStorage.setItem(KEY, m);
  };

  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}
