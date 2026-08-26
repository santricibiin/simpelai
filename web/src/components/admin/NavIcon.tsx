"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Boxes,
  Coins,
  Cpu,
  Gauge,
  KeyRound,
  LayoutDashboard,
  PanelLeft,
  PanelTop,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";

export const navIcons: Record<string, LucideIcon> = {
  LayoutDashboard,
  Activity,
  Gauge,
  ScrollText,
  KeyRound,
  Boxes,
  Users,
  Coins,
  Webhook,
  ShieldCheck,
  SlidersHorizontal,
  Cpu,
  PanelLeft,
  PanelTop,
};

export function NavIcon({
  name,
  active = false,
  scope = "default",
}: {
  name: string;
  active?: boolean;
  scope?: string;
}) {
  const Icon = navIcons[name] ?? Cpu;

  return (
    <motion.span
      className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg"
      whileHover={{ scale: 1.12, rotate: -5 }}
      transition={{ type: "spring", stiffness: 340, damping: 18 }}
    >
      {active && (
        <>
          <motion.span
            layoutId={`navIconGlow-${scope}`}
            className="absolute inset-0 rounded-lg bg-crimson/20"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
          <motion.span
            className="absolute inset-0 rounded-lg border border-crimson/50"
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.1, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      <Icon
        className={`relative h-[18px] w-[18px] transition-colors ${
          active ? "text-crimson-400" : "text-slate-500 group-hover:text-crimson-500 dark:text-slate-400"
        }`}
      />
    </motion.span>
  );
}
