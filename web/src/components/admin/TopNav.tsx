"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navFlat } from "@/lib/nav";
import { PanelIcon } from "./icons";

export default function TopNav() {
  const pathname = usePathname();

  return (
    <div className="hidden border-b border-slate-900/10 lg:block dark:border-white/10">
      <ul className="flex items-center gap-0.5 overflow-x-auto px-4 sm:px-6">
        {navFlat.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm transition ${
                  active
                    ? "border-crimson font-medium text-crimson-500"
                    : "border-transparent text-slate-600 hover:text-crimson-500 dark:text-slate-300"
                }`}
              >
                <PanelIcon name={item.icon} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
