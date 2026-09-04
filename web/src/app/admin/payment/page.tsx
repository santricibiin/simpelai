import type { Metadata } from "next";
import { headers } from "next/headers";
import PaymentSettingsForm from "@/components/admin/PaymentSettingsForm";
import { getPaymentSettings, listOrders } from "@/lib/payment";

export const metadata: Metadata = { title: "Payment" };
export const dynamic = "force-dynamic";

export default async function PaymentPage() {
  const [settings, all, h] = await Promise.all([getPaymentSettings(), listOrders(500), headers()]);

  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const callbackUrl = `${proto}://${host}/api/payment/callback`;

  const limit = 5;
  const totalPages = Math.max(1, Math.ceil(all.length / limit));
  const initialData = {
    orders: all.slice(0, limit).map((o) => ({
      invoice: o.invoice,
      status: o.status,
      amount: o.amount,
      productName: o.productName,
      tokens: o.tokens,
      createdAt: o.createdAt,
      paidAt: o.paidAt ?? undefined,
      delivered: o.delivered ?? undefined,
    })),
    total: all.length,
    page: 1,
    totalPages,
    counts: {
      all: all.length,
      paid: all.filter((o) => o.status === "paid").length,
      pending: all.filter((o) => o.status === "pending").length,
      expired: all.filter((o) => o.status === "expired").length,
      failed: all.filter((o) => o.status === "failed").length,
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Payment</h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Konfigurasi pembayaran QRIS (DANA / NeoBank / GoPay), kode unik nominal, rate limit, dan masa berlaku pesanan.
        </p>
      </div>

      <PaymentSettingsForm initialSettings={settings} initialData={initialData} callbackUrl={callbackUrl} />
    </div>
  );
}
