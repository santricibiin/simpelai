"use client";

import { LogOut } from "lucide-react";
import { motion } from "framer-motion";
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
    <motion.button
      type="button"
      onClick={logout}
      disabled={busy}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-900/15 px-3 py-2 text-xs font-semibold transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-60 dark:border-white/15"
    >
      <motion.span animate={busy ? { x: [0, 4, 0] } : {}} transition={{ duration: 0.6, repeat: Infinity }}>
        <LogOut className="h-4 w-4" />
      </motion.span>
      Keluar
    </motion.button>
  );
}
