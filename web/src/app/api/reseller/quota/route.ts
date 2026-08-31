import { NextResponse } from "next/server";
import { getResellerQuota, requireAdmin } from "@/lib/reseller";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { status, data, error } = await getResellerQuota();
  if (!data) return NextResponse.json({ error: error ?? "gagal memuat kuota" }, { status });
  return NextResponse.json(data);
}
