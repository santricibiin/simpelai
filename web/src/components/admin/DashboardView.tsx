"use client";

import { Boxes, Coins, Cpu, Router, Zap } from "lucide-react";
import { useState } from "react";
import { AreaChart, BarChart, DonutChart } from "./Charts";
import { ChartPanel, KpiCard, UserRow } from "./Panels";

const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);
const rupiah = (n: number) => `Rp${new Intl.NumberFormat("id-ID").format(n)}`;
const clock = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

export type DashboardData = {
  bandel: {
    quota: { resellerId: string; quota: number; totalQuota: number; balance: number } | null;
    activeCustomers: number;
    exceededCustomers: number;
    suspendedCustomers: number;
    totalCustomers: number;
    weeklyActive: number;
    modelUsage: { model: string; multiplier: number; successRate: number; customerCount: number }[];
    topByUsage: { id: number; name: string; used: number; max: number; status: string }[];
    topByQuota: { id: number; name: string; used: number; max: number; status: string }[];
  };
  gateway: {
    revenue: number;
    paidCount: number;
    pendingCount: number;
    totalOrders: number;
    keys: { id: number; name: string; key_prefix: string; revoked: number; tokens_used: number; token_quota: number | null; requests: number }[];
    rust: {
      kpis: { tokens_30d: number; requests_30d: number; revenue_cents_30d: number; total_users: number; active_users: number };
      series: { day: string; tokens: number; requests: number }[];
      by_model: { model: string; tokens: number }[];
      recent_users: { id: number; email: string; name: string; role: string }[];
    } | null;
  };
  bandelOrders: { invoice: string; productName: string; amount: number; status: string; createdAt: string; delivered?: string }[];
  paymentOnline: boolean;
};

const statusTone = (s: string) =>
  s === "paid"
    ? "bg-emerald-500/10 text-emerald-400"
    : s === "pending"
      ? "bg-amber-500/10 text-amber-500"
      : "bg-slate-500/10 text-slate-400";

export default function DashboardView({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState<"gateway" | "bandel">("gateway");
  const short = (d: string) => d.slice(5);

  const rust = data.gateway.rust;
  const series = rust?.series ?? [];
  const byModel = rust?.by_model ?? [];

  const gatewayCards = [
    { icon: "Zap", label: "Token 30 hari (gateway)", value: compact(rust?.kpis.tokens_30d ?? 0) },
    { icon: "Activity", label: "Request 30 hari (gateway)", value: compact(rust?.kpis.requests_30d ?? 0) },
    { icon: "Coins", label: `Revenue QRIS${data.paymentOnline ? "" : " (offline)"}`, value: rupiah(data.gateway.revenue) },
    { icon: "KeyRound", label: "API key aktif", value: `${data.gateway.keys.filter((k) => !k.revoked).length}/${data.gateway.keys.length}` },
  ];

  const usedBandel = data.bandel.quota ? data.bandel.quota.totalQuota - data.bandel.quota.quota : 0;
  const bandelCards = [
    { icon: "Coins", label: "Saldo reseller", value: new Intl.NumberFormat("id-ID").format(data.bandel.quota?.balance ?? 0) },
    { icon: "Boxes", label: "Kuota tersisa", value: compact(data.bandel.quota?.quota ?? 0) },
    { icon: "Users", label: "Customer aktif", value: `${data.bandel.activeCustomers}/${data.bandel.totalCustomers}` },
    { icon: "Activity", label: "Pemakai minggu ini", value: String(data.bandel.weeklyActive) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Grid Overview</h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            {tab === "gateway"
              ? "Statistik gateway Rust Anda — request, token, dan transaksi pembayaran."
              : "Statistik reseller bandelbanget.xyz — kuota, customer, dan kesehatan model."}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-900/15 p-1 dark:border-white/15">
          {[
            { id: "gateway" as const, label: "Gateway", icon: Cpu },
            { id: "bandel" as const, label: "Bandel", icon: Router },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.id ? "bg-crimson text-offwhite" : "text-slate-500 hover:text-crimson-500 dark:text-slate-400"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "gateway" ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gatewayCards.map((c) => (
              <KpiCard key={c.label} icon={c.icon} label={c.label} value={c.value} />
            ))}
          </ul>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartPanel icon="LineChart" title="Token per hari" className="lg:col-span-2">
              <AreaChart
                label="Token per hari"
                data={series.length ? series.map((p) => ({ label: short(p.day), value: p.tokens })) : [{ label: "—", value: 0 }]}
              />
            </ChartPanel>

            <ChartPanel icon="PieChart" title="Share per model">
              <DonutChart
                label="Share per model"
                data={byModel.length ? byModel.map((m) => ({ label: m.model, value: m.tokens })) : [{ label: "belum ada", value: 1 }]}
              />
            </ChartPanel>

            <ChartPanel icon="BarChart3" title="Request per hari" className="lg:col-span-2">
              <BarChart
                label="Request per hari"
                data={series.length ? series.map((p) => ({ label: short(p.day), value: p.requests })) : [{ label: "—", value: 0 }]}
              />
            </ChartPanel>

            <ChartPanel icon="Users" title="User terbaru">
              <ul className="divide-y divide-slate-900/10 dark:divide-white/10">
                {(rust?.recent_users ?? []).map((u) => (
                  <UserRow key={u.id} name={u.name} email={u.email} role={u.role} />
                ))}
                {!rust?.recent_users?.length && (
                  <li className="py-8 text-center text-xs text-slate-400">Belum ada user selain admin.</li>
                )}
              </ul>
            </ChartPanel>
          </div>

          <ChartPanel icon="KeyRound" title="Pemakaian API key gateway">
            {data.gateway.keys.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Belum ada API key.</p>
            ) : (
              <ul className="divide-y divide-slate-900/10 dark:divide-white/10">
                {data.gateway.keys.map((k) => {
                  const pct = k.token_quota ? Math.min(100, (k.tokens_used / k.token_quota) * 100) : 0;
                  return (
                    <li key={k.id} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{k.name}</span>
                          {k.revoked ? (
                            <span className="rounded-full bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-400">dicabut</span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase text-emerald-400">aktif</span>
                          )}
                        </span>
                        <span className="mt-1 block font-mono text-[10px] text-slate-400">
                          {k.key_prefix}··· · {compact(k.tokens_used)}
                          {k.token_quota ? ` / ${compact(k.token_quota)}` : " token"} · {k.requests} req
                        </span>
                      </span>
                      <span className="w-32 shrink-0">
                        <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-crimson to-crimson-600"
                            style={{ width: `${Math.max(pct, k.token_quota ? 2 : 0)}%` }}
                          />
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </ChartPanel>

          <ChartPanel icon="CreditCard" title="Transaksi gateway (QRIS)">
            {data.bandelOrders.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Belum ada transaksi.</p>
            ) : (
              <ul className="divide-y divide-slate-900/10 dark:divide-white/10">
                {data.bandelOrders.slice(0, 8).map((o) => (
                  <li key={o.invoice} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{o.productName}</span>
                      <span className="block font-mono text-[10px] text-slate-400">
                        {o.invoice} · {clock(o.createdAt)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs">{rupiah(o.amount)}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${statusTone(o.status)}`}>
                      {o.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ChartPanel>
        </>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bandelCards.map((c) => (
              <KpiCard key={c.label} icon={c.icon} label={c.label} value={c.value} />
            ))}
          </ul>

          {data.bandel.quota && (
            <ChartPanel icon="Gauge" title="Pemakaian kuota reseller">
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    terpakai <span className="text-crimson-500">{compact(usedBandel)}</span> dari{" "}
                    {compact(data.bandel.quota.totalQuota)} token
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    sisa <span className="text-emerald-400">{compact(data.bandel.quota.quota)}</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-crimson to-crimson-600"
                    style={{
                      width: `${Math.min(100, Math.max(0.5, (usedBandel / Math.max(1, data.bandel.quota.totalQuota)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="mt-2 font-mono text-[10px] text-slate-400">
                  reseller {data.bandel.quota.resellerId} ·{" "}
                  {((usedBandel / Math.max(1, data.bandel.quota.totalQuota)) * 100).toFixed(2)}% terpakai ·{" "}
                  {data.bandel.exceededCustomers} exceed · {data.bandel.suspendedCustomers} suspended
                </p>
              </div>
            </ChartPanel>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartPanel icon="BarChart3" title="Model paling sering digunakan (7 hari)">
              {data.bandel.modelUsage.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Belum ada data.</p>
              ) : (
                <BarChart
                  label="Jumlah member pemakai"
                  data={data.bandel.modelUsage.slice(0, 10).map((m) => ({
                    label: m.model.length > 12 ? `${m.model.slice(0, 10)}…` : m.model,
                    value: m.customerCount,
                  }))}
                />
              )}
              <p className="mt-3 font-mono text-[10px] text-slate-400">
                diurutkan dari model dengan pemakai terbanyak · {data.bandel.modelUsage.length} model dipakai
              </p>
            </ChartPanel>

            <ChartPanel icon="HeartPulse" title="Kesehatan model (7 hari)">
              {data.bandel.modelUsage.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Belum ada data.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.bandel.modelUsage.slice(0, 8).map((m) => (
                    <li key={m.model}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-mono text-xs font-semibold">{m.model}</span>
                        <span
                          className={`shrink-0 font-mono text-[10px] ${
                            m.successRate >= 95 ? "text-emerald-400" : m.successRate >= 70 ? "text-amber-500" : "text-crimson-400"
                          }`}
                        >
                          ×{m.multiplier} · {m.successRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                        <div
                          className={`h-full rounded-full ${m.successRate >= 95 ? "bg-emerald-500" : m.successRate >= 70 ? "bg-amber-500" : "bg-crimson"}`}
                          style={{ width: `${Math.max(2, m.successRate)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ChartPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartPanel icon="TrendingUp" title="Member — pemakaian terbanyak">
              {data.bandel.topByUsage.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Belum ada data.</p>
              ) : (
                <BarChart
                  label="Token terpakai"
                  data={data.bandel.topByUsage.map((c) => ({
                    label: c.name.length > 12 ? `${c.name.slice(0, 10)}…` : c.name,
                    value: c.used,
                  }))}
                />
              )}
            </ChartPanel>

            <ChartPanel icon="Boxes" title="Member — kuota terbesar">
              {data.bandel.topByQuota.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Belum ada data.</p>
              ) : (
                <BarChart
                  label="Kuota maksimum"
                  data={data.bandel.topByQuota.map((c) => ({
                    label: c.name.length > 12 ? `${c.name.slice(0, 10)}…` : c.name,
                    value: c.max,
                  }))}
                />
              )}
            </ChartPanel>
          </div>

          <ChartPanel icon="CreditCard" title="Transaksi bandel (top up member)">
            {data.bandelOrders.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Belum ada transaksi.</p>
            ) : (
              <ul className="divide-y divide-slate-900/10 dark:divide-white/10">
                {data.bandelOrders.slice(0, 8).map((o) => (
                  <li key={o.invoice} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{o.productName}</span>
                      <span className="block font-mono text-[10px] text-slate-400">
                        {o.invoice} · {clock(o.createdAt)} · {o.delivered ? "kuota terkirim" : "—"}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs">{rupiah(o.amount)}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${statusTone(o.status)}`}>
                      {o.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ChartPanel>
        </>
      )}
    </div>
  );
}
