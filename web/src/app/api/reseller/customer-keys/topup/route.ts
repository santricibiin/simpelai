import { NextResponse } from "next/server";
import { requireAdmin, topupCustomerKey } from "@/lib/reseller";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body harus JSON" }, { status: 400 });
  }

  const { hashtag, tierId } = (body ?? {}) as { hashtag?: unknown; tierId?: unknown };

  if (typeof hashtag !== "string" || !/^#[\w.-]+$/.test(hashtag)) {
    return NextResponse.json({ error: "format hashtag tidak valid (contoh: #NamaCustomer)" }, { status: 400 });
  }
  if (typeof tierId !== "string" || !tierId.trim()) {
    return NextResponse.json({ error: "tier topup wajib dipilih" }, { status: 400 });
  }

  const { status, data, error } = await topupCustomerKey(hashtag, tierId.trim());
  if (!data) return NextResponse.json({ error: error ?? "gagal top up" }, { status });
  return NextResponse.json(data);
}
