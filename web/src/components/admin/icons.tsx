"use client";

import {
  Activity,
  BarChart3,
  Boxes,
  Coins,
  Cpu,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LineChart,
  PieChart,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
  Webhook,
  type LucideIcon,
} from "lucide-react";

export const icons: Record<string, LucideIcon> = {
  LayoutDashboard,
  Activity,
  Gauge,
  ScrollText,
  KeyRound,
  Boxes,
  Users,
  Coins,
  Wallet,
  Webhook,
  ShieldCheck,
  SlidersHorizontal,
  LineChart,
  BarChart3,
  PieChart,
  Zap: Activity,
  Cpu,
};

export function PanelIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Cpu;
  return <Icon className={className} />;
}
