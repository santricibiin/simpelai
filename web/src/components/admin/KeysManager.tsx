"use client";

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlatformKey } from "@/lib/api";
import Modal from "./Modal";

const PRESETS = [
  { label: "1 juta", value: 1_000_000 },
  { label: "10 juta", value: 10_000_000 },
  { label: "100 juta", value: 100_000_000 },
];

const num = (n: number) => n.toLocaleString("id-ID");

const lat = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${n}ms`);

const field =
  "w-full rounded-xl border border-slate-900/15 bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-50";

const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-900/15 px-5 py-2.5 text-sm font-medium transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-50 dark:border-white/15";

export default function KeysManager({ initial }: { initial: PlatformKey[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rpm, setRpm] = useState("60");
  const [quota, setQuota] = useState("1000000");
  const [unlimited, setUnlimited] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [editTarget, setEditTarget] = useState<PlatformKey | null>(null);
  const [editQuota, setEditQuota] = useState("");
  const [editRpm, setEditRpm] = useState("");
  const [delTarget, setDelTarget] = useState<PlatformKey | null>(null);
  const [resetTarget, setResetTarget] = useState<PlatformKey | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("create");
    setError(null);
    setFresh(null);

    const res = await fetch("/api/proxy/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        rpm_limit: Number(rpm) || 60,
        token_quota: unlimited ? null : Number(quota) || null,
      }),
    }).catch(() => null);

    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setError(data?.error ?? "Gagal membuat key.");
      setBusy(null);
      return;
    }

    setFresh(data.api_key);
    setName("");
    setBusy(null);
    router.refresh();
  };

  const patch = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/proxy/api/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);

    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      throw new Error(d?.error ?? "Gagal menyimpan.");
    }
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setBusy("edit");
    setModalError(null);
    try {
      const raw = editQuota.trim();
      await patch(editTarget.id, {
        token_quota: raw === "" ? null : Number(raw),
        rpm_limit: Number(editRpm) || undefined,
      });
      setEditTarget(null);
      router.refresh();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(null);
    }
  };

  const doReset = async () => {
    if (!resetTarget) return;
    setBusy("reset");
    setModalError(null);
    try {
      await patch(resetTarget.id, { reset_usage: true });
      setResetTarget(null);
      router.refresh();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Gagal reset.");
    } finally {
      setBusy(null);
    }
  };

  const doRevoke = async () => {
    if (!delTarget) return;
    setBusy("revoke");
    setModalError(null);
    const res = await fetch(`/api/proxy/api/keys/${delTarget.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setModalError("Gagal mencabut key.");
      setBusy(null);
      return;
    }
    setDelTarget(null);
    setBusy(null);
    router.refresh();
  };

  const copy = async () => {
    if (!fresh) return;
    await navigator.clipboard.writeText(fresh).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="glass space-y-4 p-5">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-crimson-500">
          Buat API key baru
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block lg:col-span-2">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              Nama key
            </span>
            <input
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="produksi-app"
              className={field}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              Jumlah token
            </span>
            <input
              type="number"
              min={1000}
              step={1000}
              value={quota}
              disabled={unlimited}
              onChange={(e) => setQuota(e.target.value)}
              className={`${field} disabled:opacity-40`}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              Limit RPM
            </span>
            <input
              type="number"
              min={1}
              max={10000}
              value={rpm}
              onChange={(e) => setRpm(e.target.value)}
              className={field}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                setUnlimited(false);
                setQuota(String(p.value));
              }}
              className="rounded-lg border border-slate-900/15 px-2.5 py-1 text-[11px] font-medium transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
            >
              {p.label}
            </button>
          ))}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={unlimited}
              onChange={(e) => setUnlimited(e.target.checked)}
              className="h-3.5 w-3.5 accent-crimson"
            />
            Tanpa batas
          </label>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs text-crimson-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <button type="submit" disabled={busy === "create"} className={btnPrimary}>
          {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Buat key
        </button>
      </form>

      {fresh && (
        <div className="glass border-crimson/40 p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-crimson-500">
            <AlertTriangle className="h-4 w-4" />
            Key hanya ditampilkan sekali
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-900/5 px-3 py-2.5 font-mono text-xs dark:bg-white/5">
              {fresh}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-900/15 px-3 py-2.5 text-xs font-medium transition hover:border-crimson-500 dark:border-white/15"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Tersalin" : "Salin"}
            </button>
          </div>
          <p className="mt-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            Endpoint: https://buatprem.biz.id/v1
          </p>
        </div>
      )}

      {initial.length === 0 ? (
        <p className="glass p-6 text-sm text-slate-500 dark:text-slate-400">Belum ada API key.</p>
      ) : (
        <ul className="space-y-3">
          {initial.map((k) => {
            const quotaSet = k.token_quota !== null;
            const pct = quotaSet ? Math.min(100, (k.tokens_used / Math.max(1, k.token_quota!)) * 100) : 0;
            const exhausted = quotaSet && k.tokens_used >= k.token_quota!;
            const total = Math.max(1, k.tokens_used);
            const inPct = (k.tokens_in / total) * pct;
            const outPct = Math.max(0, pct - inPct);

            return (
              <li key={k.id} className="glass p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-crimson-500" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{k.name}</span>
                      {k.revoked ? (
                        <span className="rounded-full bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-400">
                          dicabut
                        </span>
                      ) : exhausted ? (
                        <span className="rounded-full bg-crimson/15 px-2 py-0.5 font-mono text-[10px] uppercase text-crimson-400">
                          kuota habis
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {k.key_prefix}··· · {k.rpm_limit} rpm
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalError(null);
                        setEditQuota(k.token_quota === null ? "" : String(k.token_quota));
                        setEditRpm(String(k.rpm_limit));
                        setEditTarget(k);
                      }}
                      aria-label={`Ubah pengaturan ${k.name}`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-900/15 transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalError(null);
                        setResetTarget(k);
                      }}
                      aria-label={`Reset pemakaian ${k.name}`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-900/15 transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    {!k.revoked && (
                      <button
                        type="button"
                        onClick={() => {
                          setModalError(null);
                          setDelTarget(k);
                        }}
                        aria-label={`Cabut key ${k.name}`}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-900/15 text-crimson-500 transition hover:border-crimson-500 dark:border-white/15"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between gap-2 font-mono text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      {num(k.tokens_used)} {quotaSet ? `/ ${num(k.token_quota!)}` : "token terpakai"}
                    </span>
                    {quotaSet ? (
                      <span className={exhausted ? "text-crimson-400" : "text-slate-400"}>{pct.toFixed(1)}%</span>
                    ) : (
                      <span className="text-slate-400">tanpa batas</span>
                    )}
                  </div>
                  {quotaSet && (
                    <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                      <div
                        className={exhausted ? "h-full bg-crimson" : "h-full bg-sky-500"}
                        style={{ width: `${inPct}%` }}
                        title={`Token in: ${num(k.tokens_in)}`}
                      />
                      <div
                        className={exhausted ? "h-full bg-crimson-400" : "h-full bg-emerald-500"}
                        style={{ width: `${outPct}%` }}
                        title={`Token out: ${num(k.tokens_out)}`}
                      />
                    </div>
                  )}
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-900/[.03] px-2.5 py-2 dark:bg-white/[.04]">
                    <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                      <ArrowUpRight className="h-3 w-3 text-sky-500" /> Token in
                    </dt>
                    <dd className="mt-0.5 font-mono text-xs font-medium">{num(k.tokens_in)}</dd>
                  </div>

                  <div className="rounded-lg bg-slate-900/[.03] px-2.5 py-2 dark:bg-white/[.04]">
                    <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                      <ArrowDownLeft className="h-3 w-3 text-emerald-500" /> Token out
                    </dt>
                    <dd className="mt-0.5 font-mono text-xs font-medium">{num(k.tokens_out)}</dd>
                  </div>

                  <div className="rounded-lg bg-slate-900/[.03] px-2.5 py-2 dark:bg-white/[.04]">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                      Request
                    </dt>
                    <dd className="mt-0.5 font-mono text-xs font-medium">{num(k.requests)}</dd>
                  </div>

                  <div className="rounded-lg bg-slate-900/[.03] px-2.5 py-2 dark:bg-white/[.04]">
                    <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                      <Timer className="h-3 w-3" /> Avg latency
                    </dt>
                    <dd className="mt-0.5 font-mono text-xs font-medium">
                      {k.avg_latency_ms > 0 ? lat(k.avg_latency_ms) : "—"}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={`Ubah ${editTarget?.name ?? ""}`}
        description="Kosongkan kuota untuk tanpa batas."
        footer={
          <>
            <button type="button" onClick={() => setEditTarget(null)} className={btnGhost}>
              Batal
            </button>
            <button type="button" onClick={saveEdit} disabled={busy === "edit"} className={btnPrimary}>
              {busy === "edit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Simpan
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              Kuota token
            </span>
            <input
              type="number"
              min={0}
              step={1000}
              value={editQuota}
              onChange={(e) => setEditQuota(e.target.value)}
              placeholder="tanpa batas"
              className={field}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setEditQuota(String(p.value))}
                className="rounded-lg border border-slate-900/15 px-2.5 py-1 text-[11px] font-medium transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setEditQuota("")}
              className="rounded-lg border border-slate-900/15 px-2.5 py-1 text-[11px] font-medium transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
            >
              Tanpa batas
            </button>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              Limit RPM
            </span>
            <input
              type="number"
              min={1}
              max={10000}
              value={editRpm}
              onChange={(e) => setEditRpm(e.target.value)}
              className={field}
            />
          </label>

          {modalError && <p className="text-xs text-crimson-400">{modalError}</p>}
        </div>
      </Modal>

      <Modal
        open={resetTarget !== null}
        onClose={() => setResetTarget(null)}
        title="Reset pemakaian token"
        description={`Pemakaian "${resetTarget?.name ?? ""}" akan dikembalikan ke 0. Riwayat di Request Logs tetap tersimpan.`}
        footer={
          <>
            <button type="button" onClick={() => setResetTarget(null)} className={btnGhost}>
              Batal
            </button>
            <button type="button" onClick={doReset} disabled={busy === "reset"} className={btnPrimary}>
              {busy === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Reset
            </button>
          </>
        }
      >
        {resetTarget && (
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            {num(resetTarget.tokens_used)} token terpakai · in {num(resetTarget.tokens_in)} / out{" "}
            {num(resetTarget.tokens_out)}
          </p>
        )}
        {modalError && <p className="mt-2 text-xs text-crimson-400">{modalError}</p>}
      </Modal>

      <Modal
        open={delTarget !== null}
        onClose={() => setDelTarget(null)}
        title="Cabut API key"
        tone="danger"
        description="Tindakan ini tidak dapat dibatalkan. Aplikasi yang memakai key ini akan langsung berhenti bekerja."
        footer={
          <>
            <button type="button" onClick={() => setDelTarget(null)} className={btnGhost}>
              Batal
            </button>
            <button
              type="button"
              onClick={doRevoke}
              disabled={busy === "revoke"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-50"
            >
              {busy === "revoke" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Ya, cabut
            </button>
          </>
        }
      >
        {delTarget && (
          <p className="rounded-lg bg-crimson/10 px-3 py-2.5 font-mono text-xs text-crimson-400">
            {delTarget.name} · {delTarget.key_prefix}···
          </p>
        )}
        {modalError && <p className="mt-2 text-xs text-crimson-400">{modalError}</p>}
      </Modal>
    </div>
  );
}
