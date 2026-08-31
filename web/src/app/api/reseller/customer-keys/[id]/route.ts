import { NextResponse } from "next/server";
import { getCustomerKey, requireAdmin } from "@/lib/reseller";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric < 1) {
    return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  }

  const { status, data, error } = await getCustomerKey(numeric);
  if (!data) return NextResponse.json({ error: error ?? "gagal memuat detail" }, { status });
  return NextResponse.json(data);
}
