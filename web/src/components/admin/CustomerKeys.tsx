"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Modal from "./Modal";
import { TOPUP_TIERS } from "@/lib/tiers";
import type { CreatedCustomerKey, CustomerKey, CustomerKeyList, TopupResult } from "@/lib/reseller";

const nf = new Intl.NumberFormat("id-ID");
const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);

const clock = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const VALID_DAYS = [7, 14, 21, 28];

const statusTone = (s: string) =>
  s === "active"
    ? "bg-emerald-500/10 text-emerald-400"
    : s === "expired"
      ? "bg-crimson/10 text-crimson-400"
      : "bg-slate-500/10 text-slate-400";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard tidak tersedia */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-xs font-medium transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Tersalin" : label}
    </button>
  );
}

export default function CustomerKeys({
  initial,
  tokenById,
}: {
  initial: CustomerKeyList | null;
  tokenById?: Map<string, string>;
}) {
  const [list, setList] = useState<CustomerKeyList | null>(initial);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(initial?.page ?? 1);
  const [filter, setFilter] = useState<"all" | "active" | "exceeded">("all");
  const [filteredList, setFilteredList] = useState<CustomerKey[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // form create
  const [form, setForm] = useState({ name: "", maxTokens: "5000000", validDays: "7" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // modals
  const [created, setCreated] = useState<CreatedCustomerKey | null>(null);
  const [detail, setDetail] = useState<CustomerKey | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  // topup
  const [topupTarget, setTopupTarget] = useState<CustomerKey | null>(null);
  const [topupTier, setTopupTier] = useState<string>("");
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [topupResult, setTopupResult] = useState<TopupResult | null>(null);

  const load = useCallback(
    async (opts: { page?: number; search?: string; filter?: "all" | "active" | "exceeded" }) => {
      setLoadingPage(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(opts.page ?? page),
          limit: "10",
        });
        const q = opts.search ?? search;
        if (q) params.set("search", q);

        const res = await fetch(`/api/reseller/customer-keys?${params}`, { cache: "no-store" }).catch(() => null);
        if (!res) throw new Error("Tidak dapat menghubungi server.");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `Gagal (HTTP ${res.status}).`);

        setList(data as CustomerKeyList);
        setPage((data as CustomerKeyList).page ?? 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat daftar customer.");
      } finally {
        setLoadingPage(false);
      }
    },
    [page, search]
  );

  useEffect(() => {
    if (!initial) load({ page: 1 });
  }, [initial, load]);

  // filter global: ambil semua customer (paging 200 maks per permintaan) lalu saring lokal
  useEffect(() => {
    let cancelled = false;
    if (filter === "all") {
      setFilteredList(null);
      return;
    }
    (async () => {
      setLoadingPage(true);
      try {
        const all: CustomerKey[] = [];
        let p = 1;
        for (;;) {
          const res = await fetch(`/api/reseller/customer-keys?page=${p}&limit=200`, {
            cache: "no-store",
          }).catch(() => null);
          if (!res?.ok) break;
          const data = (await res.json()) as CustomerKeyList;
          all.push(...data.data);
          if (p >= data.totalPages) break;
          p += 1;
        }
        if (!cancelled) {
          setFilteredList(all.filter((c) => (filter === "active" ? c.status === "active" : c.status !== "active")));
        }
      } finally {
        if (!cancelled) setLoadingPage(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/reseller/customer-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          maxTokens: Number(form.maxTokens),
          validDays: Number(form.validDays),
        }),
      }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Gagal (HTTP ${res.status}).`);

      setCreated(data as CreatedCustomerKey);
      setForm({ name: "", maxTokens: "5000000", validDays: "7" });
      load({ page: 1 });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Gagal membuat customer key.");
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (id: number) => {
    setDetailBusy(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/reseller/customer-keys/${id}`, { cache: "no-store" }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (res?.ok) setDetail(data as CustomerKey);
    } finally {
      setDetailBusy(false);
    }
  };

  const submitTopup = async () => {
    if (!topupTarget || !topupTier) return;
    setTopupBusy(true);
    setTopupError(null);
    try {
      const res = await fetch("/api/reseller/customer-keys/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashtag: topupTarget.hashtag ?? `#${topupTarget.name}`, tierId: topupTier }),
      }).catch(() => null);
      if (!res) throw new Error("Tidak dapat menghubungi server.");

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Gagal (HTTP ${res.status}).`);

      setTopupResult(data as TopupResult);
      load({ page: 1 });
    } catch (e) {
      setTopupError(e instanceof Error ? e.message : "Gagal top up.");
    } finally {
      setTopupBusy(false);
    }
  };

  const closeTopup = () => {
    setTopupTarget(null);
    setTopupTier("");
    setTopupError(null);
    setTopupResult(null);
  };

  const field =
    "w-full rounded-xl border border-slate-900/15 bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/30 dark:border-white/15";

  const perPage = 10;
  const source = filteredList ?? (list?.data ?? []);
  const totalPages = filteredList ? Math.max(1, Math.ceil(filteredList.length / perPage)) : (list?.totalPages ?? 1);
  const rows = filteredList
    ? filteredList.slice((page - 1) * perPage, page * perPage)
    : source;
  const canPrev = page > 1 && !loadingPage;
  const canNext = page < totalPages && !loadingPage;

  const changeFilter = (id: "all" | "active" | "exceeded") => {
    setFilter(id);
    setPage(1);
  };

  const filters: { id: "all" | "active" | "exceeded"; label: string }[] = [
    { id: "all", label: "Semua" },
    { id: "active", label: "Aktif" },
    { id: "exceeded", label: "Exceed" },
  ];

  return (
    <section className="glass p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="customer-keys-body"
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 text-crimson-500">
          <UserRound className="h-4 w-4" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Customer API Keys</h2>
          <span className="rounded-full bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] normal-case tracking-normal text-slate-400">
            {list ? `${nf.format(list.total)} customer` : "…"}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 sm:inline">
            {open ? "tutup" : "kelola"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      <div
        id="customer-keys-body"
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">

      {/* create form */}
      <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_10rem_auto] xl:items-end">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Nama customer
          </span>
          <input
            required
            maxLength={60}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Customer Baru"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Max token
          </span>
          <input
            required
            type="number"
            min={5_000_000}
            step={1_000_000}
            value={form.maxTokens}
            onChange={(e) => setForm({ ...form, maxTokens: e.target.value })}
            className={`${field} font-mono text-xs`}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Masa aktif
          </span>
          <select
            value={form.validDays}
            onChange={(e) => setForm({ ...form, validDays: e.target.value })}
            className={field}
          >
            {VALID_DAYS.map((d) => (
              <option key={d} value={d} className="text-slate-900">
                {d} hari
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={creating}
          className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-crimson px-5 text-sm font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Buat key
        </button>

        {createError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs text-crimson-400 sm:col-span-2 xl:col-span-4"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {createError}
          </p>
        )}
      </form>

      {/* search + filter + list */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load({ page: 1, search: e.currentTarget.value });
            }}
            placeholder="Cari nama customer… (Enter)"
            className="w-full rounded-lg border border-slate-900/15 bg-transparent py-1.5 pl-9 pr-3 text-xs outline-none transition focus:border-crimson-500 dark:border-white/15"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-900/15 p-0.5 dark:border-white/15">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => changeFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                filter === f.id
                  ? "bg-crimson text-offwhite"
                  : "text-slate-500 hover:text-crimson-500 dark:text-slate-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              load({ page: 1, search: "" });
            }}
            className="rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-xs transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
          >
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={() => (filter === "all" ? load({ page }) : setFilteredList(null) || changeFilter(filter))}
          disabled={loadingPage}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-xs font-medium transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-50 dark:border-white/15"
        >
          {loadingPage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
        {filteredList !== null && (
          <span className="rounded-full bg-crimson/10 px-2 py-0.5 font-mono text-[10px] text-crimson-400">
            {nf.format(filteredList.length)} key {filter === "active" ? "aktif" : "exceed"}
          </span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs text-crimson-400"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-3 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-900/10 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 dark:border-white/10">
              <th className="py-2.5 pr-3 font-semibold">Customer</th>
              <th className="py-2.5 pr-3 font-semibold">Status</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Max</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Terpakai</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Sisa</th>
              <th className="py-2.5 pr-3 font-semibold">Pemakaian</th>
              <th className="py-2.5 pr-3 font-semibold">Kedaluwarsa</th>
              <th className="py-2.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/10 dark:divide-white/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                  {loadingPage
                    ? "Memuat…"
                    : filter === "all"
                      ? "Belum ada customer key."
                      : `Tidak ada key ${filter === "active" ? "aktif" : "yang exceed"} di halaman ini — coba halaman lain atau reset filter.`}
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="transition hover:bg-crimson/[.03]">
                <td className="py-3 pr-3">
                  <p className="max-w-[12rem] truncate font-medium">{c.name}</p>
                  <p className="font-mono text-[10px] text-slate-400">#{c.id}</p>
                </td>
                <td className="py-3 pr-3">
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${statusTone(c.status)}`}>
                    {c.status}
                  </span>
                </td>
                <td className="py-3 pr-3 text-right font-mono text-xs">{compact(c.maxTokens)}</td>
                <td className="py-3 pr-3 text-right font-mono text-xs">{compact(c.usedTokens)}</td>
                <td className="py-3 pr-3 text-right font-mono text-xs">{compact(c.remainingTokens)}</td>
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-crimson to-crimson-600"
                        style={{ width: `${Math.min(100, Math.max(1, c.usagePercent))}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{c.usagePercent?.toFixed(1) ?? "—"}%</span>
                  </div>
                </td>
                <td className="py-3 pr-3 font-mono text-[10px] text-slate-400">{clock(c.expiresAt)}</td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    {tokenById?.get(String(c.id)) && (
                      <a
                        href={`/quota/${tokenById.get(String(c.id))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Buka dashboard member"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-xs transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Dashboard
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setTopupError(null);
                        setTopupResult(null);
                        setTopupTier("");
                        setTopupTarget(c);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-crimson/30 bg-crimson/5 px-2.5 py-1.5 text-xs font-medium text-crimson-500 transition hover:bg-crimson/10"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Top up
                    </button>
                    <button
                      type="button"
                      onClick={() => openDetail(c.id)}
                      className="rounded-lg border border-slate-900/15 px-2.5 py-1.5 text-xs transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/15"
                    >
                      Detail
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[10px] text-slate-400">
            hal. {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                filteredList ? setPage((p) => Math.max(1, p - 1)) : load({ page: page - 1 })
              }
              disabled={!canPrev}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-900/15 transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-40 dark:border-white/15"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                filteredList ? setPage((p) => Math.min(totalPages, p + 1)) : load({ page: page + 1 })
              }
              disabled={!canNext}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-900/15 transition hover:border-crimson-500 hover:text-crimson-500 disabled:opacity-40 dark:border-white/15"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      </div>
      </div>

      {/* modal: key baru (ditampilkan sekali) */}
      <Modal
        open={created !== null}
        onClose={() => setCreated(null)}
        title="Customer key dibuat"
        description="Simpan key ini sekarang — raw key hanya ditampilkan satu kali dan tidak bisa dilihat lagi."
      >
        {created && (
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-900/[.04] p-3 dark:bg-white/[.04]">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">Nama</p>
              <p className="mt-1 text-sm font-medium">{created.name}</p>
            </div>
            <div className="rounded-xl border border-crimson/30 bg-crimson/5 p-3">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-crimson-500">
                <KeyRound className="h-3 w-3" /> API key
              </p>
              <p className="mt-1.5 break-all font-mono text-xs">{created.key}</p>
              <div className="mt-2.5">
                <CopyButton value={created.key} label="Salin key" />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-900/[.04] p-3 dark:bg-white/[.04]">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">Max token</p>
                <p className="mt-1 font-mono text-xs">{nf.format(created.maxTokens)}</p>
              </div>
              <div className="rounded-xl bg-slate-900/[.04] p-3 dark:bg-white/[.04]">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">Masa aktif</p>
                <p className="mt-1 font-mono text-xs">{created.validDays} hari</p>
              </div>
              <div className="rounded-xl bg-slate-900/[.04] p-3 dark:bg-white/[.04]">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">Sisa saldo</p>
                <p className="mt-1 font-mono text-xs">{nf.format(created.remainingQuota)}</p>
              </div>
            </div>
            {created.dashboardUrl && (
              <a
                href={created.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-crimson-500 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Buka dashboard customer
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* modal: top up customer */}
      <Modal
        open={topupTarget !== null}
        onClose={closeTopup}
        title={topupResult ? "Top up berhasil" : `Top up ${topupTarget?.name ?? ""}`}
        description={
          topupResult
            ? undefined
            : `Tambah kuota dari saldo reseller · ${topupTarget?.hashtag ?? ""}`
        }
        footer={
          topupResult ? (
            <button
              type="button"
              onClick={closeTopup}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-crimson-600"
            >
              <Check className="h-4 w-4" />
              Selesai
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={closeTopup}
                className="inline-flex items-center justify-center rounded-xl border border-slate-900/15 px-5 py-2.5 text-sm font-medium transition hover:border-crimson-500 dark:border-white/15"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={submitTopup}
                disabled={topupBusy || !topupTier}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-sm font-semibold text-offwhite transition hover:bg-crimson-600 disabled:opacity-50"
              >
                {topupBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {topupBusy ? "Memproses" : "Top up sekarang"}
              </button>
            </>
          )
        }
      >
        {topupResult ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-400">
              <Check className="h-4 w-4 shrink-0" />
              Paket <span className="font-mono font-semibold">{topupResult.tier.label}</span> (
              {nf.format(topupResult.tier.tokens)} token) berhasil ditambahkan.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { label: "Max token baru", value: nf.format(topupResult.customerKey.maxTokens) },
                { label: "Masa aktif", value: `${topupResult.customerKey.validDays} hari` },
                { label: "Sisa kuota reseller", value: compact(topupResult.remainingQuota) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-900/[.04] p-3 dark:bg-white/[.04]">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">{s.label}</p>
                  <p className="mt-1 font-mono text-xs">{s.value}</p>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-slate-400">
              kedaluwarsa baru: {clock(topupResult.customerKey.expiresAt)}
            </p>
          </div>
        ) : (
          topupTarget && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-slate-900/[.04] px-3.5 py-2.5 font-mono text-[11px] dark:bg-white/[.04]">
                <span className="text-slate-400">
                  max: <span className="text-slate-600 dark:text-slate-300">{compact(topupTarget.maxTokens)}</span>
                </span>
                <span className="text-slate-400">
                  sisa: <span className="text-slate-600 dark:text-slate-300">{compact(topupTarget.remainingTokens)}</span>
                </span>
                <span className="text-slate-400">
                  exp: <span className="text-slate-600 dark:text-slate-300">{clock(topupTarget.expiresAt)}</span>
                </span>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                  Pilih paket top up
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {TOPUP_TIERS.map((t) => {
                    const active = topupTier === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTopupTier(t.id)}
                        aria-pressed={active}
                        className={`rounded-xl border px-3 py-2.5 text-left transition ${
                          active
                            ? "border-crimson-500 bg-crimson/10"
                            : "border-slate-900/15 hover:border-crimson-500/50 dark:border-white/15"
                        }`}
                      >
                        <p className={`font-mono text-xs font-semibold ${active ? "text-crimson-500" : ""}`}>
                          {t.id.toUpperCase()}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{t.label}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Setiap paket menambah token sesuai label dan memperpanjang masa aktif 28 hari.
                </p>
              </div>

              {topupError && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs text-crimson-400"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {topupError}
                </p>
              )}
            </div>
          )
        )}
      </Modal>

      {/* modal: detail customer */}
      <Modal
        open={detail !== null || detailBusy}
        onClose={() => {
          setDetail(null);
          setDetailBusy(false);
        }}
        title={detail ? detail.name : "Detail customer"}
        description={detail ? `Customer #${detail.id}` : "Memuat…"}
      >
        {detailBusy && (
          <div className="grid place-items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-crimson-500" />
          </div>
        )}
        {detail && !detailBusy && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${statusTone(detail.status)}`}>
                {detail.status}
              </span>
              {detail.expiresAt && (
                <span className="font-mono text-[10px] text-slate-400">
                  kedaluwarsa {clock(detail.expiresAt)}
                </span>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { label: "Max token", value: nf.format(detail.maxTokens) },
                { label: "Terpakai", value: nf.format(detail.usedTokens) },
                { label: "Sisa", value: nf.format(detail.remainingTokens) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-900/[.04] p-3 dark:bg-white/[.04]">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">{s.label}</p>
                  <p className="mt-1 font-mono text-xs">{s.value}</p>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                <span>Pemakaian</span>
                <span className="font-mono text-crimson-500">{detail.usagePercent?.toFixed(2) ?? "—"}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-crimson to-crimson-600"
                  style={{ width: `${Math.min(100, Math.max(1, detail.usagePercent ?? 0))}%` }}
                />
              </div>
            </div>

            {detail.usage && (
              <div className="rounded-xl bg-slate-900/[.04] p-3 dark:bg-white/[.04]">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">Usage rinci</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs sm:grid-cols-3">
                  <div>
                    <dt className="text-[10px] text-slate-400">prompt</dt>
                    <dd>{nf.format(detail.usage.promptTokens ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">completion</dt>
                    <dd>{nf.format(detail.usage.completionTokens ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">cached</dt>
                    <dd>{nf.format(detail.usage.cachedTokens ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">total</dt>
                    <dd>{nf.format(detail.usage.totalTokens ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">request</dt>
                    <dd>{nf.format(detail.usage.requests ?? 0)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
}
