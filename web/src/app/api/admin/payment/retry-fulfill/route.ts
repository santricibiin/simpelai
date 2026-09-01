import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/reseller";
import { fulfillOrder, listOrders } from "@/lib/payment";

export const dynamic = "force-dynamic";

/** Retry fulfillment untuk order paid yang belum delivered. */
export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const orders = await listOrders(200);
  const pending = orders.filter((o) => o.status === "paid" && !o.delivered);
  const results: { invoice: string; ok: boolean; delivered?: string | null }[] = [];

  for (const o of pending) {
    const delivered = await fulfillOrder(o.invoice);
    results.push({ invoice: o.invoice, ok: Boolean(delivered), delivered });
  }

  return NextResponse.json({ retried: results.length, results });
}
