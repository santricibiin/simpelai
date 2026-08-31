import { NextResponse } from "next/server";
import { listModels, requireAdmin } from "@/lib/reseller";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { status, data, error } = await listModels();
  if (!data) return NextResponse.json({ error: error ?? "gagal memuat model" }, { status });
  return NextResponse.json(data);
}
