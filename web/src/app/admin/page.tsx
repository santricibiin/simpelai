import type { Metadata } from "next";
import DashboardView, { type DashboardData } from "@/components/admin/DashboardView";
import { getResellerQuota, listAllCustomerKeys, usageByModel } from "@/lib/reseller";
import { getPaymentSettings, listOrders } from "@/lib/payment";
import { getPlatformKeys, getAdminStats } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [quota, allCustomers, usage, orders, settings, platformKeys, rustStats] = await Promise.all([
    getResellerQuota().catch(() => null),
    listAllCustomerKeys().catch(() => []),
    usageByModel("week").catch(() => null),
    listOrders(500).catch(() => []),
    getPaymentSettings(),
    getPlatformKeys().catch(() => null),
    getAdminStats().catch(() => null),
  ]);

  const paidOrders = (orders ?? []).filter((o) => o.status === "paid");

  // model paling sering dipakai: hitung jumlah member yang memakai tiap model (dari byCustomer)
  const modelCount = new Map<string, { model: string; multiplier: number; successRate: number; customerCount: number }>();
  const byCustomer = usage.data?.byCustomer ?? [];
  for (const c of byCustomer) {
    for (const m of c.models ?? []) {
      const cur = modelCount.get(m.model);
      if (cur) cur.customerCount += 1;
      else
        modelCount.set(m.model, {
          model: m.model,
          multiplier: m.multiplier,
          successRate: m.successRate,
          customerCount: 1,
        });
    }
  }
  const modelUsage = [...modelCount.values()].sort((a, b) => b.customerCount - a.customerCount);

  const data: DashboardData = {
    bandel: {
      quota: quota.data,
      activeCustomers: allCustomers.filter((c) => c.status === "active").length,
      exceededCustomers: allCustomers.filter((c) => c.status === "exceeded").length,
      suspendedCustomers: allCustomers.filter((c) => c.status !== "active" && c.status !== "exceeded").length,
      totalCustomers: allCustomers.length,
      weeklyActive: byCustomer.length,
      modelUsage,
      topByUsage: [...allCustomers]
        .sort((a, b) => b.usedTokens - a.usedTokens)
        .slice(0, 8)
        .map((c) => ({ id: c.id, name: c.name, used: c.usedTokens, max: c.maxTokens, status: c.status })),
      topByQuota: [...allCustomers]
        .sort((a, b) => b.maxTokens - a.maxTokens)
        .slice(0, 8)
        .map((c) => ({ id: c.id, name: c.name, used: c.usedTokens, max: c.maxTokens, status: c.status })),
    },
    gateway: {
      revenue: paidOrders.reduce((s, o) => s + o.amount, 0),
      paidCount: paidOrders.length,
      pendingCount: (orders ?? []).filter((o) => o.status === "pending").length,
      totalOrders: orders?.length ?? 0,
      keys: platformKeys.data ?? [],
      rust: rustStats.data,
    },
    bandelOrders: (orders ?? []).slice(0, 10),
    paymentOnline: settings.qrisProvider !== "none",
  };

  return <DashboardView data={data} />;
}
