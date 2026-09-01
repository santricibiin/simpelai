import { NextResponse } from "next/server";
import { cancelOrder } from "@/lib/payment";

export const dynamic = "force-dynamic";

const INVOICE_RE = /^INV[A-Z0-9]{6,20}$/;

export async function POST(_req: Request, { params }: { params: Promise<{ invoice: string }> }) {
  const { invoice } = await params;
  if (!INVOICE_RE.test(invoice)) return NextResponse.json({ error: "Invoice tidak valid." }, { status: 400 });

  const ok = await cancelOrder(invoice);
  if (!ok) return NextResponse.json({ error: "Transaksi tidak ditemukan / sudah diproses." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
