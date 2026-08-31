import { NextResponse } from "next/server";
import { requireAdmin, usageByModel } from "@/lib/reseller";

const VALID = ["today", "yesterday", "week", "month"];

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "today";
  if (!VALID.includes(period)) {
    return NextResponse.json({ error: "period harus today/yesterday/week/month" }, { status: 400 });
  }

  const customerIdRaw = url.searchParams.get("customerId");
  const customerId = customerIdRaw ? Number(customerIdRaw) : undefined;
  if (customerId !== undefined && (!Number.isInteger(customerId) || customerId < 1)) {
    return NextResponse.json({ error: "customerId tidak valid" }, { status: 400 });
  }

  const { status, data, error } = await usageByModel(period, customerId);
  if (!data) return NextResponse.json({ error: error ?? "gagal memuat usage" }, { status });
  return NextResponse.json(data);
}
