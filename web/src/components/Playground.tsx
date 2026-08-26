"use client";

import { motion } from "framer-motion";
import { Play, Terminal, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { models } from "@/lib/content";

const answer =
  "Inference grid aktif. Token pertama terkirim dari node sin-02 melalui HTTP/2 stream, billing dihitung per 1K token pada saat response selesai.";

const request = (model: string) => `curl https://api.neuroforge.dev/v1/chat/completions \\
  -H "Authorization: Bearer $NF_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "stream": true,
    "messages": [{"role":"user","content":"Ping the grid"}]
  }'`;

export default function Playground() {
  const [model, setModel] = useState(models[0]);
  const [out, setOut] = useState("");
  const [ms, setMs] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(true);
    setOut("");
    setMs(null);
    const started = performance.now();
    const words = answer.split(" ");

    words.forEach((w, i) => {
      timers.current.push(
        setTimeout(() => {
          setOut((p) => (p ? `${p} ${w}` : w));
          if (i === words.length - 1) {
            setMs(Math.round(performance.now() - started));
            setRunning(false);
          }
        }, 90 + i * 55),
      );
    });
  };

  return (
    <section id="playground" className="container-x scroll-mt-20 py-16 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6 }}
        className="glass neon-ring overflow-hidden"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-900/10 px-4 py-3 sm:px-6 dark:border-white/10">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            <Terminal className="h-4 w-4 text-crimson-500" /> live playground
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="nf-model" className="sr-only">
              Pilih model
            </label>
            <select
              id="nf-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="max-w-[9.5rem] truncate rounded-lg border border-slate-900/15 bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-crimson-500 sm:max-w-none dark:border-white/15"
            >
              {models.map((m) => (
                <option key={m} value={m} className="text-slate-900">
                  {m}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={run}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-lg bg-crimson px-3 py-1.5 text-xs font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-60"
            >
              <Play className="h-3.5 w-3.5" /> {running ? "Streaming" : "Run"}
            </button>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-2">
          <pre className="overflow-x-auto border-b border-slate-900/10 p-4 font-mono text-[11px] leading-relaxed text-slate-700 sm:p-6 sm:text-xs lg:border-b-0 lg:border-r dark:border-white/10 dark:text-slate-300">
            <code>{request(model)}</code>
          </pre>

          <div className="relative min-h-[13rem] overflow-hidden p-4 sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 animate-scan bg-gradient-to-b from-crimson/10 to-transparent" />
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              <span>response</span>
              <span className="inline-flex items-center gap-1 text-crimson-500">
                <Timer className="h-3.5 w-3.5" /> {ms === null ? (running ? "…" : "idle") : `${ms}ms`}
              </span>
            </div>
            <p aria-live="polite" className="mt-4 break-words font-mono text-xs leading-relaxed sm:text-sm">
              {out || <span className="text-slate-400">Tekan Run untuk mengukur latency stream.</span>}
              {running && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-crimson-500 align-middle" />}
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
