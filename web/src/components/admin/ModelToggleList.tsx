"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ProviderModel } from "@/lib/api";

export default function ModelToggleList({
  providerId,
  models,
}: {
  providerId: number;
  models: ProviderModel[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<number | "bulk" | null>(null);
  const [optimistic, setOptimistic] = useState<Record<number, boolean>>({});

  const isOn = (m: ProviderModel) => optimistic[m.id] ?? m.enabled === 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? models.filter((m) => m.model.toLowerCase().includes(q)) : models;
  }, [models, query]);

  const activeCount = models.filter(isOn).length;

  const toggle = async (m: ProviderModel) => {
    const next = !isOn(m);
    setBusy(m.id);
    setOptimistic((p) => ({ ...p, [m.id]: next }));

    const res = await fetch(`/api/proxy/api/admin/providers/${providerId}/models/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    }).catch(() => null);

    if (!res?.ok) {
      setOptimistic((p) => ({ ...p, [m.id]: !next }));
    } else {
      router.refresh();
    }
    setBusy(null);
  };

  const bulk = async (enabled: boolean) => {
    setBusy("bulk");
    const res = await fetch(`/api/proxy/api/admin/providers/${providerId}/models`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    }).catch(() => null);

    if (res?.ok) {
      setOptimistic(Object.fromEntries(models.map((m) => [m.id, enabled])));
      router.refresh();
    }
    setBusy(null);
  };

  if (!models.length) {
    return (
      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
        Belum ada model. Klik Test untuk mengambil daftar dari provider.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">
          Model · {activeCount}/{models.length} aktif
        </p>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <label htmlFor={`q-${providerId}`} className="sr-only">
              Cari model
            </label>
            <input
              id={`q-${providerId}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="cari"
              className="w-28 rounded-lg border border-slate-900/15 bg-transparent py-1 pl-7 pr-2 font-mono text-xs outline-none focus:border-crimson-500 sm:w-40 dark:border-white/15"
            />
          </div>
          <button
            type="button"
            onClick={() => bulk(true)}
            disabled={busy === "bulk"}
            className="rounded-lg border border-slate-900/15 px-2 py-1 text-[11px] font-medium transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-50 dark:border-white/15"
          >
            Semua on
          </button>
          <button
            type="button"
            onClick={() => bulk(false)}
            disabled={busy === "bulk"}
            className="rounded-lg border border-slate-900/15 px-2 py-1 text-[11px] font-medium transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-50 dark:border-white/15"
          >
            Semua off
          </button>
        </div>
      </div>

      <ul className="mt-2 max-h-72 divide-y divide-slate-900/10 overflow-y-auto rounded-xl border border-slate-900/10 dark:divide-white/10 dark:border-white/10">
        {filtered.map((m) => {
          const on = isOn(m);
          return (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2">
              <span
                className={`min-w-0 flex-1 truncate font-mono text-xs ${
                  on ? "" : "text-slate-400 line-through dark:text-slate-500"
                }`}
              >
                {m.model}
              </span>

              {busy === m.id && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-crimson-500" />}

              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${on ? "Nonaktifkan" : "Aktifkan"} ${m.model}`}
                onClick={() => toggle(m)}
                disabled={busy === m.id || busy === "bulk"}
                className={`relative h-5 w-9 shrink-0 rounded-full transition disabled:opacity-50 ${
                  on ? "bg-crimson" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                    on ? "left-[1.15rem]" : "left-0.5"
                  }`}
                />
              </button>
            </li>
          );
        })}
        {!filtered.length && (
          <li className="px-3 py-4 text-center font-mono text-xs text-slate-400">tidak ada yang cocok</li>
        )}
      </ul>
    </div>
  );
}
