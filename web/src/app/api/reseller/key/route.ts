import { NextResponse } from "next/server";
import { getResellerKey, maskKey, requireAdmin, setResellerApiKey } from "@/lib/reseller";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { key, source } = await getResellerKey();
  if (!key) return NextResponse.json({ configured: false, source });
  return NextResponse.json({ configured: true, source, masked: maskKey(key) });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body harus JSON" }, { status: 400 });
  }

  const key = (body as { key?: unknown })?.key;
  if (typeof key !== "string" || !key.trim()) {
    return NextResponse.json({ error: "key wajib diisi" }, { status: 400 });
  }

  const { status, data, error } = await setResellerApiKey(key.trim());
  if (!data) return NextResponse.json({ error: error ?? "gagal menyimpan key" }, { status });
  return NextResponse.json({ ok: true, resellerId: data.resellerId });
}
