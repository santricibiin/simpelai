import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/reseller";
import { fulfillOrder, listOrders } from "@/lib/payment";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Retry fulfillment untuk order paid yang belum delivered. */
export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const orders = await listOrders(200);
  // order telegram di-retry oleh poller bot (tg_delivered=0) — di sini hanya yang butuh flag ulang
  const pending = orders.filter((o) => o.status === "paid" && !o.delivered);
  const results: { invoice: string; ok: boolean; delivered?: string | null; note?: string }[] = [];

  for (const o of pending) {
    if (o.tg) {
      // reset claim bot → poller mengirim ulang di tick berikutnya
      await execute("UPDATE payment_orders SET tg_delivered = 0 WHERE invoice = ?", [o.invoice]);
      results.push({ invoice: o.invoice, ok: true, delivered: null, note: "diteruskan ke poller bot telegram" });
      continue;
    }
    const delivered = await fulfillOrder(o.invoice);
    results.push({ invoice: o.invoice, ok: Boolean(delivered), delivered });
  }

  return NextResponse.json({ retried: results.length, results });
}
