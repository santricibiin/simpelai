"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-900/15 px-3 py-2 text-xs font-semibold transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-60 dark:border-white/15"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Keluar</span>
    </button>
  );
}
