"use client";

import { AlertTriangle, Check, Loader2, Play, Power, Save, Send, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type BotConfig = {
  token: string;
  adminId: string;
  forceJoinOn: boolean;
  forceJoinLink: string;
  forceJoinChatId: string;
  notifyChannelId: string;
};

export default function TelegramBotSettings({ initial, initialRunning }: { initial: BotConfig; initialRunning: boolean }) {
  const [cfg, setCfg] = useState<BotConfig>(initial);
  const [hasToken, setHasToken] = useState(Boolean(initial.token));
  const [running, setRunning] = useState(initialRunning);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [powerBusy, setPowerBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/telegram", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const d = await res.json();
    if (d?.config) {
      setCfg((prev) => ({ ...d.config, token: d.config.hasToken ? prev.token : d.config.token }));
      setHasToken(Boolean(d.config.hasToken));
    }
    setRunning(Boolean(d?.running));
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/admin/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Gagal (HTTP ${res.status}).`);
      if (cfg.token && cfg.token.includes(":")) setHasToken(true);
      setState("saved");
      setNote("Tersimpan. Start/ulang bot untuk menerapkan.");
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
      setState("idle");
    }
  };

  const power = async (action: "start" | "stop") => {
    setPowerBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/admin/telegram/power", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Gagal (HTTP ${res.status}).`);
      setRunning(Boolean(data.running));
      setNote(action === "start" ? "Bot dijalankan — cek log di /var/log/telegram-bot.log." : "Bot dihentikan.");
      setTimeout(refresh, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setPowerBusy(false);
    }
  };

  const field =
    "w-full rounded-xl border border-slate-900/15 bg-transparent px-3.5 py-2.5 text-sm outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15";
  const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400";

  return (
    <div className="space-y-6">
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-crimson/10 text-crimson-500">
            <Send className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-base font-semibold">Bot Telegram</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Jualan otomatis via Telegram — produk & pembayaran dari sistem ini.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase ${
              running ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"
            }`}
          >
            {running ? "running" : "stopped"}
          </span>
          <button
            type="button"
            onClick={() => power(running ? "stop" : "start")}
            disabled={powerBusy}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
              running
                ? "border border-crimson/40 text-crimson-500 hover:bg-crimson/10"
                : "bg-crimson text-offwhite hover:bg-crimson-600"
            }`}
          >
            {powerBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : running ? <Power className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? "Stop bot" : "Start bot"}
          </button>
        </div>
      </section>

      <form onSubmit={save} className="glass space-y-5 p-5">
        <header className="flex items-center gap-2 text-crimson-500">
          <ShieldCheck className="h-4 w-4" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Konfigurasi</h2>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block lg:col-span-2">
            <span className={labelCls}>
              Token bot {hasToken && <span className="font-mono text-[10px] normal-case tracking-normal text-emerald-400">(tersimpan — biarkan kosong bila tidak diganti)</span>}
            </span>
            <input
              type="password"
              value={cfg.token}
              onChange={(e) => setCfg({ ...cfg, token: e.target.value })}
              placeholder="123456789:ABCdefGhIJklMnOpQrStUvWxYz dari @BotFather"
              spellCheck={false}
              autoComplete="off"
              className={`${field} font-mono text-xs`}
            />
          </label>

          <label className="block">
            <span className={labelCls}>Admin Telegram ID (untuk /admin /ceksaldo /bc)</span>
            <input
              value={cfg.adminId}
              onChange={(e) => setCfg({ ...cfg, adminId: e.target.value })}
              placeholder="mis. 123456789 — kirim /getid ke bot"
              spellCheck={false}
              className={`${field} font-mono text-xs`}
            />
          </label>

          <label className="block">
            <span className={labelCls}>Channel notifikasi transaksi (opsional)</span>
            <input
              value={cfg.notifyChannelId}
              onChange={(e) => setCfg({ ...cfg, notifyChannelId: e.target.value })}
              placeholder="-1001234567890"
              spellCheck={false}
              className={`${field} font-mono text-xs`}
            />
          </label>
        </div>

        <div className="rounded-xl border border-slate-900/10 p-4 dark:border-white/10">
          <button
            type="button"
            onClick={() => setCfg({ ...cfg, forceJoinOn: !cfg.forceJoinOn })}
            aria-pressed={cfg.forceJoinOn}
            className="flex w-full items-center justify-between gap-3"
          >
            <span className="text-left">
              <span className={`block text-xs font-semibold ${cfg.forceJoinOn ? "text-crimson-500" : ""}`}>
                Force join channel
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                User baru wajib join channel sebelum bisa belanja
              </span>
            </span>
            <span
              className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                cfg.forceJoinOn ? "bg-crimson" : "bg-slate-900/20 dark:bg-white/20"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-offwhite shadow transition-all ${
                  cfg.forceJoinOn ? "left-[1.15rem]" : "left-0.5"
                }`}
              />
            </span>
          </button>

          {cfg.forceJoinOn && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Link channel</span>
                <input
                  value={cfg.forceJoinLink}
                  onChange={(e) => setCfg({ ...cfg, forceJoinLink: e.target.value })}
                  placeholder="https://t.me/namachannel"
                  className={`${field} font-mono text-xs`}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Chat ID channel</span>
                <input
                  value={cfg.forceJoinChatId}
                  onChange={(e) => setCfg({ ...cfg, forceJoinChatId: e.target.value })}
                  placeholder="-1001234567890"
                  spellCheck={false}
                  className={`${field} font-mono text-xs`}
                />
              </label>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs text-crimson-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        {note && (
          <p className="rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-400">{note}</p>
        )}

        <button
          type="submit"
          disabled={state === "saving" || state === "saved"}
          className="inline-flex items-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite shadow-neon transition hover:bg-crimson-600 disabled:opacity-50"
        >
          {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {state === "saving" ? "Menyimpan…" : state === "saved" ? "Tersimpan" : "Simpan konfigurasi"}
        </button>
      </form>

      <section className="glass p-5">
        <h3 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-crimson-500">Fitur bot</h3>
        <ul className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-400">
          {[
            "/start — registrasi + welcome + force join",
            "/produk — katalog kategori → produk → qty → beli",
            "Pembayaran QRIS otomatis (kode unik, expired, polling)",
            "Delivery otomatis: stok manual (FIFO) & token bandel (key baru + PIN)",
            "/ceksaldo — kuota & saldo reseller bandel",
            "/cektrx — laporan transaksi hari ini",
            "/bc <pesan> — broadcast ke semua member",
            "/getid — ambil chat ID (user/channel)",
          ].map((f) => (
            <li key={f} className="rounded-xl bg-slate-900/[.04] px-3.5 py-2.5 dark:bg-white/[.04]">
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">
          Bot berbagi produk dari halaman <span className="font-medium">Produk</span> dan pembayaran QRIS dari halaman{" "}
          <span className="font-medium">Payment</span> — kategori bot otomatis dari kategori produk (manual), "Token AI"
          (bandel), dan "Token Gateway" (gateway). Log: <code className="font-mono">/var/log/telegram-bot.log</code>.
        </p>
      </section>
    </div>
  );
}
