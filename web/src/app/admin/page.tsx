import type { Metadata } from "next";
import { AreaChart, BarChart, DonutChart } from "@/components/admin/Charts";
import { ChartPanel, KpiCard, UserRow } from "@/components/admin/Motion";
import { compact, usd } from "@/lib/api";
import { getAdminStats } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard Admin — NeuroForge" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { data } = await getAdminStats();

  if (!data) {
    return (
      <p className="glass p-6 text-sm text-crimson-400">
        Gagal memuat statistik. Pastikan service Rust berjalan di {process.env.API_URL ?? "http://localhost:8080"}.
      </p>
    );
  }

  const { kpis, series, by_model, recent_users } = data;
  const short = (d: string) => d.slice(5);

  const cards = [
    { icon: "Zap", label: "Token 30 hari", value: compact(kpis.tokens_30d), raw: { to: kpis.tokens_30d, kind: "compact" as const } },
    { icon: "Activity", label: "Request 30 hari", value: compact(kpis.requests_30d), raw: { to: kpis.requests_30d, kind: "compact" as const } },
    { icon: "Coins", label: "Revenue 30 hari", value: usd(kpis.revenue_cents_30d), raw: { to: kpis.revenue_cents_30d, kind: "usd" as const } },
    { icon: "Users", label: "User aktif", value: `${kpis.active_users}/${kpis.total_users}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Grid Overview</h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Konsumsi token dan revenue 30 hari terakhir.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <KpiCard key={c.label} icon={c.icon} label={c.label} value={c.value} raw={c.raw} delay={i * 0.08} />
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartPanel icon="LineChart" title="Token per hari" className="lg:col-span-2">
          <AreaChart label="Token per hari" data={series.map((p) => ({ label: short(p.day), value: p.tokens }))} />
        </ChartPanel>

        <ChartPanel icon="PieChart" title="Share per model" delay={0.1}>
          <div className="mt-2">
            <DonutChart label="Share per model" data={by_model.map((m) => ({ label: m.model, value: m.tokens }))} />
          </div>
        </ChartPanel>

        <ChartPanel icon="BarChart3" title="Request per hari" className="lg:col-span-2" delay={0.05}>
          <BarChart label="Request per hari" data={series.map((p) => ({ label: short(p.day), value: p.requests }))} />
        </ChartPanel>

        <ChartPanel icon="Users" title="User terbaru" delay={0.15}>
          <ul className="divide-y divide-slate-900/10 dark:divide-white/10">
            {recent_users.map((u, i) => (
              <UserRow key={u.id} name={u.name} email={u.email} role={u.role} index={i} />
            ))}
          </ul>
        </ChartPanel>
      </div>
    </div>
  );
}
