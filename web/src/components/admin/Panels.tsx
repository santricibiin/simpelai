import { Activity, Coins, Users, Zap } from "lucide-react";
import { PanelIcon } from "./icons";

export function KpiCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  const glyphs = { Zap, Activity, Coins, Users };
  const Icon = glyphs[icon as keyof typeof glyphs] ?? Activity;

  return (
    <li className="glass p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <Icon className="h-4 w-4 shrink-0 text-crimson-500" />
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
    </li>
  );
}

export function ChartPanel({
  icon,
  title,
  className = "",
  children,
}: {
  icon: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`glass p-5 ${className}`}>
      <header className="flex items-center gap-2 text-crimson-500">
        <PanelIcon name={icon} />
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">{title}</h2>
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function UserRow({ name, email, role }: { name: string; email: string; role: string }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-crimson/10 font-display text-xs font-semibold text-crimson-500">
        {name.slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{email}</span>
      </span>
      <span className="shrink-0 rounded-full border border-slate-900/10 px-2 py-0.5 font-mono text-[10px] uppercase dark:border-white/10">
        {role}
      </span>
    </li>
  );
}
