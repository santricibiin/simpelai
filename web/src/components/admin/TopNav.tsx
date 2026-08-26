"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navFlat } from "@/lib/nav";
import { navIcons } from "./NavIcon";
import { Cpu } from "lucide-react";

export default function TopNav() {
  const pathname = usePathname();

  return (
    <div className="hidden border-b border-slate-900/10 lg:block dark:border-white/10">
      <ul className="flex items-center gap-0.5 overflow-x-auto px-4 sm:px-6">
        {navFlat.map((item) => {
          const active = pathname === item.href;
          const Icon = navIcons[item.icon] ?? Cpu;

          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-1.5 px-3 py-3 text-sm whitespace-nowrap transition ${
                  active ? "font-medium text-crimson-500" : "text-slate-600 hover:text-crimson-500 dark:text-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {active && (
                  <motion.span
                    layoutId="navActiveBar-topnav"
                    className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-crimson"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
