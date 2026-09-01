import { NextResponse } from "next/server";
import { expireOverdue, getOrderByInvoice } from "@/lib/payment";

export const dynamic = "force-dynamic";

const GRACE_MS = 10 * 60 * 1000;

export async function GET(_req: Request, { params }: { params: Promise<{ invoice: string }> }) {
  const { invoice } = await params;
  await expireOverdue();
  const order = await getOrderByInvoice(invoice);
  if (!order) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const expiredView =
    order.status === "pending" && new Date(order.expiresAt).getTime() + GRACE_MS <= Date.now();

  return NextResponse.json({
    ok: true,
    status: expiredView ? "expired" : order.status,
    paidAt: order.paidAt ?? null,
    expiredView: order.status === "pending" && new Date(order.expiresAt).getTime() <= Date.now(),
  });
}
