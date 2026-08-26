"use client";

import { AlertTriangle, Check, Loader2, Pencil, Plus, Power, RefreshCw, Trash2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Provider } from "@/lib/api";
import ModelToggleList from "./ModelToggleList";
import Modal from "./Modal";

type TestResult = { ok: boolean; latency_ms?: number; model_count?: number; error?: string };

export default function RoutingManager({ initial }: { initial: Provider[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", base_url: "", api_key: "", priority: "100" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<number, TestResult>>({});
  const [delTarget, setDelTarget] = useState<Provider | null>(null);
  const [editTarget, setEditTarget] = useState<Provider | null>(null);
  const [editPriority, setEditPriority] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const call = async (path: string, init?: RequestInit) => {
    const res = await fetch(`/api/proxy${path}`, init).catch(() => null);
    if (!res) throw new Error("Tidak dapat menghubungi server.");
    if (res.status === 204) return {};
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `Gagal (HTTP ${res.status})`);
    return data;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("create");
    setError(null);

    try {
      await call("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          base_url: form.base_url,
          api_key: form.api_key,
          priority: Number(form.priority) || 100,
        }),
      });
      setForm({ name: "", base_url: "", api_key: "", priority: "100" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah provider.");
    } finally {
      setBusy(null);
    }
  };

  const test = async (id: number) => {
    setBusy(`test-${id}`);
    try {
      const data = (await call(`/api/admin/providers/${id}/test`, { method: "POST" })) as TestResult;
      setTests((p) => ({ ...p, [id]: data }));
      router.refresh();
    } catch (e) {
      setTests((p) => ({ ...p, [id]: { ok: false, error: e instanceof Error ? e.message : "gagal" } }));
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (p: Provider) => {
    setBusy(`toggle-${p.id}`);
    try {
      await call(`/api/admin/providers/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: p.enabled === 0 }),
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengubah status.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!delTarget) return;
    setBusy("del");
    setModalError(null);
    try {
      await call(`/api/admin/providers/${delTarget.id}`, { method: "DELETE" });
      setDelTarget(null);
      router.refresh();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Gagal menghapus.");
    } finally {
      setBusy(null);
    }
  };

  const savePriority = async () => {
    if (!editTarget) return;
    setBusy("edit");
    setModalError(null);
    try {
      await call(`/api/admin/providers/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: Number(editPriority) || 100 }),
      });
      setEditTarget(null);
      router.refresh();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(null);
    }
  };

  const field = "w-full rounded-xl border border-slate-900/15 bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15";

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="glass space-y-4 p-5">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-crimson-500">
          Tambah provider OpenAI-compatible
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              Nama
            </span>
            <input
              required
              maxLength={80}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="OpenAI"
              className={field}
            />
          </label>

          <label className="block xl:col-span-2">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              Base URL
            </span>
            <input
              required
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className={`${field} font-mono text-xs`}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              Prioritas
            </span>
            <input
              type="number"
              min={1}
              max={999}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className={field}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            API key provider
          </span>
          <input
            required
            type="password"
            value={form.api_key}
            onChange={(e) => setForm({ ...form, api_key: e.target.value })}
            placeholder="sk-..."
            className={`${field} font-mono text-xs`}
          />
          <span className="mt-1.5 block text-[11px] text-slate-500 dark:text-slate-400">
            Key dienkripsi AES-256-GCM sebelum disimpan dan tidak pernah dikirim balik ke browser.
          </span>
        </label>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs text-crimson-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy === "create"}
          className="inline-flex items-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-50"
        >
          {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {busy === "create" ? "Memverifikasi" : "Tambah & verifikasi"}
        </button>
      </form>

      {initial.length === 0 ? (
        <p className="glass p-6 text-sm text-slate-500 dark:text-slate-400">
          Belum ada provider. Tambahkan satu di atas — sistem akan memanggil <code className="font-mono">/models</code>{" "}
          untuk memvalidasi key sebelum menyimpan.
        </p>
      ) : (
        <ul className="space-y-3">
          {initial.map((p) => {
            const t = tests[p.id];
            return (
              <li key={p.id} className="glass p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-semibold">{p.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
                          p.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"
                        }`}
                      >
                        {p.enabled ? "aktif" : "nonaktif"}
                      </span>
                      <span className="rounded-full bg-crimson/10 px-2 py-0.5 font-mono text-[10px] text-crimson-400">
                        prio {p.priority}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate font-mono text-xs text-slate-500 dark:text-slate-400">{p.base_url}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => test(p.id)}
                      disabled={busy === `test-${p.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-xs font-medium transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-50 dark:border-white/15"
                    >
                      {busy === `test-${p.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Test
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(p)}
                      disabled={busy === `toggle-${p.id}`}
                      aria-label={p.enabled ? "Nonaktifkan" : "Aktifkan"}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-900/15 transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-50 dark:border-white/15"
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalError(null);
                        setEditPriority(String(p.priority));
                        setEditTarget(p);
                      }}
                      aria-label={`Ubah pengaturan ${p.name}`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-900/15 transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalError(null);
                        setDelTarget(p);
                      }}
                      aria-label={`Hapus provider ${p.name}`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-900/15 text-crimson-500 transition hover:border-crimson-500 dark:border-white/15"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">
                    Key ({p.keys.length})
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    {p.keys.map((k) => (
                      <li key={k.id} className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-slate-500 dark:text-slate-400">{k.label}</span>
                        <span className="text-crimson-400">{k.key_hint}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <ModelToggleList providerId={p.id} models={p.model_list ?? []} />
                </div>

                {(t || p.last_error) && (
                  <p
                    className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                      t?.ok
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-crimson/10 text-crimson-400"
                    }`}
                  >
                    {t?.ok ? (
                      <>
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {t.latency_ms}ms · {t.model_count} model tersedia
                      </>
                    ) : (
                      <>
                        <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {t?.error ?? p.last_error}
                      </>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={`Ubah ${editTarget?.name ?? ""}`}
        description="Prioritas kecil dicoba lebih dulu saat merutekan request."
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-900/15 px-5 py-2.5 text-sm font-medium transition hover:border-crimson-500 dark:border-white/15"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={savePriority}
              disabled={busy === "edit"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-50"
            >
              {busy === "edit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Simpan
            </button>
          </>
        }
      >
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Prioritas
          </span>
          <input
            type="number"
            min={1}
            max={999}
            value={editPriority}
            onChange={(e) => setEditPriority(e.target.value)}
            className={field}
          />
        </label>
        {editTarget && (
          <p className="mt-3 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {editTarget.base_url}
          </p>
        )}
        {modalError && <p className="mt-2 text-xs text-crimson-400">{modalError}</p>}
      </Modal>

      <Modal
        open={delTarget !== null}
        onClose={() => setDelTarget(null)}
        title="Hapus provider"
        tone="danger"
        description="Semua API key provider dan daftar model ikut terhapus. Tindakan ini tidak dapat dibatalkan."
        footer={
          <>
            <button
              type="button"
              onClick={() => setDelTarget(null)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-900/15 px-5 py-2.5 text-sm font-medium transition hover:border-crimson-500 dark:border-white/15"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy === "del"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-50"
            >
              {busy === "del" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Ya, hapus
            </button>
          </>
        }
      >
        {delTarget && (
          <div className="rounded-lg bg-crimson/10 px-3 py-2.5 font-mono text-xs text-crimson-400">
            <p>{delTarget.name}</p>
            <p className="mt-1 opacity-80">
              {delTarget.keys.length} key · {delTarget.model_list?.length ?? 0} model
            </p>
          </div>
        )}
        {modalError && <p className="mt-2 text-xs text-crimson-400">{modalError}</p>}
      </Modal>

    </div>
  );
}