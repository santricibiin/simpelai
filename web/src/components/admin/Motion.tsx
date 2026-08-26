"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";
import {
  Activity,
  BarChart3,
  Coins,
  Cpu,
  LineChart,
  PieChart,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const icons: Record<string, LucideIcon> = {
  Zap,
  Activity,
  Coins,
  Users,
  Cpu,
  LineChart,
  BarChart3,
  PieChart,
};

export function IconOrb({
  name,
  size = "md",
  spin = false,
}: {
  name: keyof typeof icons | string;
  size?: "sm" | "md";
  spin?: boolean;
}) {
  const Icon = icons[name] ?? Cpu;
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const glyph = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span className={`relative grid ${box} shrink-0 place-items-center`}>
      <motion.span
        className="absolute inset-0 rounded-xl bg-crimson/15"
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute inset-0 rounded-xl border border-crimson/40"
        animate={spin ? { rotate: 360 } : { opacity: [0.4, 1, 0.4] }}
        transition={{ duration: spin ? 14 : 3.2, repeat: Infinity, ease: spin ? "linear" : "easeInOut" }}
        style={spin ? { borderStyle: "dashed" } : undefined}
      />
      <motion.span
        className="relative grid h-full w-full place-items-center rounded-xl bg-crimson/10 text-crimson-500"
        whileHover={{ scale: 1.12, rotate: -6 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
      >
        <Icon className={glyph} />
      </motion.span>
    </span>
  );
}

function Counter({ to, format }: { to: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const raw = useMotionValue(0);
  const [text, setText] = useState(format(0));
  const shown = useTransform(raw, (v) => format(v));

  useEffect(() => {
    const stop = shown.on("change", setText);
    return stop;
  }, [shown]);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(raw, to, { duration: 1.4, ease: "easeOut" });
    return () => controls.stop();
  }, [inView, raw, to]);

  return <span ref={ref}>{text}</span>;
}

export function KpiCard({
  icon,
  label,
  value,
  raw,
  delay = 0,
}: {
  icon: string;
  label: string;
  value: string;
  raw?: { to: number; kind: "compact" | "usd" };
  delay?: number;
}) {
  const format =
    raw?.kind === "usd"
      ? (n: number) => `$${Math.round(n / 100).toLocaleString("en-US")}`
      : (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

  return (
    <motion.li
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="glass neon-ring relative overflow-hidden p-5"
    >
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-crimson/20 blur-2xl"
        animate={{ opacity: [0.35, 0.75, 0.35], scale: [1, 1.15, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <IconOrb name={icon} size="sm" />
      </div>
      <p className="relative mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {raw ? <Counter to={raw.to} format={format} /> : value}
      </p>
    </motion.li>
  );
}

export function ChartPanel({
  icon,
  title,
  className = "",
  delay = 0,
  children,
}: {
  icon: string;
  title: string;
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
      className={`glass relative overflow-hidden p-5 ${className}`}
    >
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-crimson/10 to-transparent"
        animate={{ y: ["-100%", "420%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear", delay }}
      />
      <header className="relative flex items-center gap-3">
        <IconOrb name={icon} size="sm" spin />
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-crimson-500">{title}</h2>
      </header>
      <div className="relative mt-4">{children}</div>
    </motion.section>
  );
}

export function UserRow({
  name,
  email,
  role,
  index,
}: {
  name: string;
  email: string;
  role: string;
  index: number;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="flex items-center gap-3 py-3"
    >
      <motion.span
        whileHover={{ scale: 1.1, rotate: -4 }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-crimson/10 font-display text-xs font-semibold text-crimson-500"
      >
        {name.slice(0, 2).toUpperCase()}
      </motion.span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{email}</span>
      </span>
      <span className="shrink-0 rounded-full border border-slate-900/10 px-2 py-0.5 font-mono text-[10px] uppercase dark:border-white/10">
        {role}
      </span>
    </motion.li>
  );
}
